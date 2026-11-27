import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

const platform = new ObjectId();
const shop = new ObjectId();
const otherShop = new ObjectId();
const userId = new ObjectId();

// authMW as production runs it for these routes: the session company's name and platform flag.
vi.mock("@coreModule/utilities/middlewares/authMW", async () => {
    const {authMWStub} = await import("@coreModule/_tests/httpHarness");
    return {
        default: (scope?: string) => (req: {body: Record<string, unknown>}, res: unknown, next: () => void) =>
            authMWStub.default(scope)(req, res, () => {
                const company = req.body.company as {_id: ObjectId};
                req.body.company = {...company, name: company._id.equals(platform) ? "Kudoo" : "Chlò Shop", isPlatformOwner: company._id.equals(platform)};
                next();
            }),
    };
});
vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import {allPermissionTags, appFor, callerHeader, type TestCaller} from "@coreModule/_tests/httpHarness";
import {getLogger} from "@coreModule/loggers/serverLog";
import {asCrossTenant, withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import Company from "@coreModule/database/schemas/company/company";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import Product from "@eCommerceModule/database/schemas/product/product";
import Collection from "@eCommerceModule/database/schemas/collection/collection";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import * as categoryRoute from "@eCommerceModule/api/eCommerce/private/checked/category";
import * as shopSettingsRoute from "@eCommerceModule/api/eCommerce/private/checked/shopSettings";
import ShopSettings from "@eCommerceModule/database/schemas/shopSettings/shopSettings";
import {buildPlatformCategoryMatcher} from "@eCommerceModule/utilities/services/category/platformCategoryMatch";
import {seedProductTaxonomy, type TaxonomyFile} from "@eCommerceModule/database/seeds/taxonomy/productTaxonomy.seed";
import {moveShopsToPlatformCategories} from "@eCommerceModule/database/seeds/taxonomy/moveShopsToPlatformCategories";
import {buildShopCatalogFilter} from "@eCommerceModule/utilities/shop/shopCatalogFilter";

const logger = getLogger("platform_categories_test");
const app = appFor([
    {basePath: "/api/eCommerce/category", router: categoryRoute.router, module: "eCommerce"},
    {basePath: "/api/eCommerce/shopSettings", router: shopSettingsRoute.router, module: "eCommerce"},
]);

const names = (en: string, sq: string) => ({en, sq, de: `${en} DE`, fr: `${en} FR`, it: `${en} IT`});
const TAXONOMY: TaxonomyFile = {
    source: {release: "test"},
    categories: [
        {id: "aa", parent: null, order: 0, slug: "apparel-and-accessories", name: names("Apparel & Accessories", "Veshje & aksesorë")},
        {id: "aa-1", parent: "aa", order: 1, slug: "clothing", name: names("Clothing", "Veshje")},
        {id: "aa-1-4", parent: "aa-1", order: 4, slug: "dresses", name: names("Dresses", "Fustane")},
        {id: "aa-1-4-3", parent: "aa-1-4", order: 3, slug: "maxi-dresses", name: names("Maxi Dresses", "Fustane maksi")},
        {id: "aa-1-13", parent: "aa-1", order: 13, slug: "shirts", name: names("Shirts", "Këmisha")},
    ],
};

beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(async () => {
    await Promise.all([Company, ProductCategory, Product, Collection, Discount, ShopSettings].map((model) => model.collection.deleteMany({})));
    await Company.collection.insertMany([
        {_id: platform, company: platform, name: "Kudoo", vat: "P-1", isPlatformOwner: true, isActive: true, modules: ["core"], createdBy: userId, deletedAt: null},
        {_id: shop, company: shop, name: "Chlò Shop", vat: "S-1", isActive: true, modules: ["core", "eCommerce"], createdBy: userId, deletedAt: null},
        {_id: otherShop, company: otherShop, name: "Tirana Wear", vat: "S-2", isActive: true, modules: ["core", "eCommerce"], createdBy: userId, deletedAt: null},
    ]);
});

const seedTree = async (data: TaxonomyFile = TAXONOMY) => {
    const company = await Company.findById(platform);
    if (!company) throw new Error("no platform");
    await seedProductTaxonomy({platformCompany: company, logger}, data);
};
const bySlug = async (slug: string) => ProductCategory.collection.findOne({slug});

describe("matching a shop's own category name (D195)", () => {
    const match = buildPlatformCategoryMatcher<string>(TAXONOMY.categories.map((row) => ({
        id: row.id, name: row.name.en, names: [row.name.sq, row.name.de], depth: row.id.split("-").length, order: row.order,
    })));

    it("matches the same name in any language, ignoring case and a demo tag", () => {
        expect(match("dresses")?.id).toBe("aa-1-4");
        expect(match("Fustane [DEMO]")).toEqual({id: "aa-1-4", name: "Dresses", how: "exact"});
    });

    it("matches a close form, and never guesses", () => {
        expect(match("Dress")).toEqual({id: "aa-1-4", name: "Dresses", how: "close"});
        expect(match("Tops & Blouses")).toBeNull();
    });
});

describe("seeding the platform tree", {timeout: 30000}, () => {
    it("adds the tree once, then follows a later release by taxonomy id", async () => {
        await seedTree();
        await seedTree();
        expect(await ProductCategory.collection.countDocuments({})).toBe(5);
        const maxi = await bySlug("maxi-dresses");
        expect(maxi?.names?.sq).toBe("Fustane maksi");
        expect(maxi?.searchText).toContain("fustane maksi");
        expect(String(maxi?.parent)).toBe(String((await bySlug("dresses"))?._id));
        expect(maxi?.requestStatus).toBe("approved");

        // A later release renames Maxi Dresses, moves Shirts under Dresses and drops Clothing's order change.
        const next: TaxonomyFile = {source: {release: "test-2"}, categories: [
            ...TAXONOMY.categories.filter((row) => row.id !== "aa-1-13" && row.id !== "aa-1-4-3"),
            {id: "aa-1-4-3", parent: "aa-1-4", order: 3, slug: "maxi-dresses", name: names("Long Dresses", "Fustane të gjata")},
        ]};
        await seedTree(next);
        expect((await bySlug("maxi-dresses"))?.name).toBe("Long Dresses");
        expect((await bySlug("shirts"))?.deletedAt).toBeInstanceOf(Date);
    });
});

describe("browsing a category across shops", {timeout: 30000}, () => {
    it("lists every shop's products in the category and below it", async () => {
        await seedTree();
        const maxi = await bySlug("maxi-dresses");
        const shirts = await bySlug("shirts");
        await Product.collection.insertMany([
            {title: "A", slug: "a", type: "physical", status: "active", company: shop, categories: [maxi?._id], deletedAt: null},
            {title: "B", slug: "b", type: "physical", status: "active", company: otherShop, categories: [maxi?._id], deletedAt: null},
            {title: "C", slug: "c", type: "physical", status: "active", company: shop, categories: [shirts?._id], deletedAt: null},
        ]);
        const filter = await buildShopCatalogFilter({companyId: {$in: [shop, otherShop]}, categorySlug: "dresses"});
        const found = await asCrossTenant("the test reads two shops' products", () => Product.find(filter ?? {_id: null}).select("title").lean());
        expect(found.map((row) => row.title).sort()).toEqual(["A", "B"]);
    });
});

describe("a shop asks for a category (D160 request)", {timeout: 30000}, () => {
    it("stores a shop's create as a request and the platform's as approved", async () => {
        const tags = allPermissionTags([ProductCategory]);
        const asShop: TestCaller = {userId: userId.toString(), companyId: shop.toString(), permissions: tags, modules: ["core", "eCommerce"]};
        const asPlatform: TestCaller = {userId: userId.toString(), companyId: platform.toString(), permissions: tags, modules: ["core", "eCommerce"]};

        const requested = await request(app).put("/api/eCommerce/category").set(callerHeader(asShop)).send({name: "Kilts"});
        expect(requested.body.error_code ?? "ok").toBe("ok");
        const added = await request(app).put("/api/eCommerce/category").set(callerHeader(asPlatform)).send({name: "Saris", names: {sq: "Sari"}});
        expect(added.body.error_code ?? "ok").toBe("ok");

        const kilts = await ProductCategory.collection.findOne({name: "Kilts"});
        expect(kilts?.requestStatus).toBe("requested");
        expect(String(kilts?.company)).toBe(platform.toString());
        expect(String(kilts?.requestedByCompany)).toBe(shop.toString());
        const saris = await ProductCategory.collection.findOne({name: "Saris"});
        expect(saris?.requestStatus).toBe("approved");
        expect(saris?.searchText).toBe("saris | sari");
    });
});

describe("moving shops onto the platform categories (P26.6)", {timeout: 30000}, () => {
    it("reports first, then relinks, keeps every old category as a collection and journals it", async () => {
        const dresses = new ObjectId();
        const tops = new ObjectId();
        await ProductCategory.collection.insertMany([
            {_id: dresses, company: shop, name: "Dresses [DEMO]", slug: "dresses", order: 0, deletedAt: null},
            {_id: tops, company: shop, name: "Tops & Blouses", slug: "tops-and-blouses", order: 1, deletedAt: null},
        ]);
        const product = new ObjectId();
        await Product.collection.insertOne({_id: product, title: "Wrap dress", slug: "wrap-dress", type: "physical", status: "active", company: shop, categories: [dresses, tops], collections: [], deletedAt: null});
        const discount = new ObjectId();
        await Discount.collection.insertOne({_id: discount, company: shop, name: "Dress week", appliesTo: "category", targetIds: [dresses, tops], deletedAt: null});
        const journalDir = fs.mkdtempSync(path.join(os.tmpdir(), "category-move-"));

        const dry = await moveShopsToPlatformCategories({apply: false, journalDir, logger, taxonomy: TAXONOMY});
        expect(dry.totals).toEqual({categories: 2, exact: 1, close: 0, unmatched: 1});
        expect(await ProductCategory.collection.countDocuments({})).toBe(2);

        const applied = await moveShopsToPlatformCategories({apply: true, journalDir, logger, taxonomy: TAXONOMY});
        expect(applied.applied).toBe(true);
        expect(fs.existsSync(applied.journal ?? "")).toBe(true);
        const platformDresses = await bySlug("dresses");
        expect(String(platformDresses?.company)).toBe(platform.toString());
        expect(await ProductCategory.collection.countDocuments({_id: {$in: [dresses, tops]}})).toBe(0);

        const moved = await Product.collection.findOne({_id: product});
        expect(moved?.categories.map(String)).toEqual([String(platformDresses?._id)]);
        const collections = await withTenant(shop, () => Collection.find({company: shop}).lean());
        expect(collections.map((collection) => collection.name).sort()).toEqual(["Dresses [DEMO]", "Tops & Blouses"]);
        expect(collections.every((collection) => collection.products.map(String).includes(String(product)))).toBe(true);
        expect(moved?.collections.map(String).sort()).toEqual(collections.map((collection) => String(collection._id)).sort());
        expect((await Discount.collection.findOne({_id: discount}))?.targetIds.map(String)).toEqual([String(platformDresses?._id)]);
    });
});

describe("What we sell (P26.8)", {timeout: 30000}, () => {
    const TWO_BRANCHES: TaxonomyFile = {source: {release: "test"}, categories: [
        ...TAXONOMY.categories,
        {id: "el", parent: null, order: 0, slug: "electronics", name: names("Electronics", "Elektronikë")},
        {id: "el-1", parent: "el", order: 1, slug: "audio", name: names("Audio", "Audio")},
    ]};
    const labels = async (caller: TestCaller, body: Record<string, unknown>) => {
        const res = await request(app).post("/api/eCommerce/category/select").set(callerHeader(caller)).send({page: 1, limit: 50, ...body});
        expect(res.body.error_code ?? "ok").toBe("ok");
        return res.body.data.map((option: {label: string}) => option.label).sort();
    };

    it("starts from the branches the shop's products use, and narrows the product picker to them", async () => {
        await seedTree(TWO_BRANCHES);
        expect(String((await bySlug("maxi-dresses"))?.branch)).toBe(String((await bySlug("apparel-and-accessories"))?._id));
        const maxi = await bySlug("maxi-dresses");
        await Product.collection.insertOne({title: "Maxi", slug: "maxi", type: "physical", status: "active", company: shop, categories: [maxi?._id], deletedAt: null});
        const tags = allPermissionTags([ProductCategory, ShopSettings]);
        const asShop: TestCaller = {userId: userId.toString(), companyId: shop.toString(), permissions: tags, modules: ["core", "eCommerce"]};

        expect(await labels(asShop, {topLevel: true})).toEqual(["Apparel & Accessories", "Electronics"]);
        // Before the shop opens its settings it has none: the picker offers every category.
        expect(await labels(asShop, {inShopBranches: true})).toContain("Electronics › Audio");

        const ensured = await request(app).post("/api/eCommerce/shopSettings/ensure").set(callerHeader(asShop)).send({});
        expect(ensured.body.error_code ?? "ok").toBe("ok");
        expect(ensured.body.branches.map((branch: {name: string}) => branch.name)).toEqual(["Apparel & Accessories"]);
        const offered = await labels(asShop, {inShopBranches: true});
        expect(offered).toContain("Dresses › Maxi Dresses");
        expect(offered).not.toContain("Electronics › Audio");
    });
});
