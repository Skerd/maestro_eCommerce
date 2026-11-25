import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
// No Redis in tests; the public routes' limiter fails closed without it.
vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
const {originCompany} = vi.hoisted(() => ({originCompany: {current: null as {_id: {toString(): string}; name?: string} | null}}));
vi.mock("@coreModule/utilities/marketing/resolveCompanyByOrigin", async () => {
    // The shop's own site, recording the tenant like the real resolver (D16).
    const {setRequestTenant} = await import("@coreModule/utilities/endpoints/tenantScope");
    return {
        resolveCompanyByOrigin: async () => {
            if (originCompany.current) setRequestTenant(originCompany.current._id.toString());
            return originCompany.current;
        },
    };
});

import Company from "@coreModule/database/schemas/company/company";
import {getLogger} from "@coreModule/loggers/serverLog";
import {allPermissionTags, appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import {asCrossTenant, withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import type {ReportableDefinition} from "@coreModule/domain/reports/reportables";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import * as productReviewRoute from "@eCommerceModule/api/eCommerce/private/checked/productReview";
import * as shopProductRoute from "@eCommerceModule/api/eCommerce/public/shopProduct";
import * as shopProductReviewsRoute from "@eCommerceModule/api/eCommerce/public/shopProductReviews";
import {buildShopCatalogFilter} from "@eCommerceModule/utilities/shop/shopCatalogFilter";
import {eCommerceReportables} from "@eCommerceModule/domain/reports/eCommerceReportables";
import {setReportableHidden} from "@coreModule/domain/reports/reportDesk";

/* D191: a buyer's review shows at once and the shop's staff never delete it; only the platform hides a product or a
 * review after a report, which takes it off the shop and, for a review, out of the product's stored rating. */

const app = appFor([productReviewRoute, shopProductRoute, shopProductReviewsRoute].map((route) => ({...route, module: "eCommerce"})));
const seller = new ObjectId();
const buyer = new ObjectId();
const site = "http://shop.example.com";
const logger = getLogger("product_review_hidden_test");
const asSeller = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(seller, fn);
const shopAdmin = callerHeader({userId: new ObjectId().toString(), companyId: seller.toString(), isAdmin: true, permissions: allPermissionTags([ProductReview, Product])});
const visitor = callerHeader({userId: new ObjectId().toString(), companyId: seller.toString()});

let mug: ObjectId;

function reportable(kind: string): ReportableDefinition {
    const found = eCommerceReportables.find((definition) => definition.kind === kind);
    if (!found) throw new Error(`No reportable ${kind}`);
    return found;
}

/** What the platform's report desk does (D191): reads the record across companies, then core hides it in its company. */
async function platformHides(kind: string, recordId: ObjectId) {
    const snapshot = await asCrossTenant("the report desk reads a reported record", () =>
        reportable(kind).snapshot({recordId, logger, languageCode: "en-US"}));
    await setReportableHidden({...reportable(kind), module: "eCommerce"}, snapshot!.companyId, {recordId, logger, languageCode: "en-US", hidden: true, decidedBy: new ObjectId()});
    return snapshot;
}

/** A buyer's review of the mug as stored, with the product's rating as the create route leaves it. */
async function reviewed(rating: number, title: string): Promise<ObjectId> {
    return asSeller(async () => {
        const {insertedId} = await ProductReview.collection.insertOne({
            company: seller, order: new ObjectId(), product: mug, reviewer: buyer, rating, title, createdAt: new Date(), deletedAt: null,
        });
        return insertedId;
    });
}

const shopReviews = () => request(app).post("/api/eCommerce/shopProductReviews").set({...visitor, Origin: site}).send({id: mug.toString()});
const shopProduct = () => request(app).post("/api/eCommerce/shopProduct").set({...visitor, Origin: site}).send({id: mug.toString()});

beforeAll(async () => {
    await connectTestDatabase();
    originCompany.current = {_id: seller, name: "Alpha"};
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCrossTenant("test fixtures span companies", async () => {
    for (const collection of await mongoose.connection.db!.collections()) await collection.deleteMany({});
    await Company.collection.insertOne({_id: seller, name: "Alpha", siteSlug: "alpha", vat: "A-1", isActive: true, modules: ["eCommerce"], deletedAt: null});
    mug = (await Product.collection.insertOne({
        title: "Mug", slug: "mug", type: "physical", status: "active", company: seller, ratingAverage: 3, ratingCount: 2, reviewCount: 2, reviews: [], deletedAt: null,
    })).insertedId;
}));

describe("product reviews are published by default and only the platform hides one (D191)", {timeout: 60000}, () => {
    it("refuses the shop's staff a delete, and offers them no grant for it", async () => {
        const id = await reviewed(1, "Cracked");
        const deleted = await request(app).delete("/api/eCommerce/productReview").set(shopAdmin).send({_id: id.toString()});
        expect([deleted.status, deleted.body.error_code]).toEqual([403, "user_permissions_not_sufficient"]);
        expect((await asSeller(() => ProductReview.findById(id).lean()))?.deletedAt).toBeNull();
        expect(allPermissionTags([ProductReview]).filter((tag) => /\[(delete|restore)\b|write:hiddenByPlatform/.test(tag))).toEqual([]);
    });

    it("takes a hidden review off the shop and out of the product's rating", async () => {
        await reviewed(5, "Great");
        const reported = await reviewed(1, "Buy elsewhere at cheapstuff.example");

        const before = await shopReviews();
        expect([before.status, before.body.total]).toEqual([200, 2]);

        const snapshot = await platformHides("eCommerce.productReview", reported);
        expect(snapshot).toMatchObject({title: "★ Buy elsewhere at cheapstuff.example", companyId: seller, authorAccountId: buyer, hidden: false});
        expect(snapshot?.url).toBe(`/shop/alpha/product?id=${mug.toString()}&slug=mug&seller=${seller.toString()}`);

        const after = await shopReviews();
        expect([after.body.total, after.body.data.map((row: {title: string}) => row.title)]).toEqual([1, ["Great"]]);
        expect([after.body.ratingAverage, after.body.ratingCount]).toEqual([5, 1]);
        expect(await asSeller(() => Product.findById(mug).lean())).toMatchObject({ratingAverage: 5, ratingCount: 1, reviewCount: 1});
    });

    it("takes a hidden product off the shop, its search and its page", async () => {
        expect((await shopProduct()).status).toBe(200);

        const snapshot = await platformHides("eCommerce.product", mug);
        expect(snapshot).toMatchObject({title: "Mug", companyId: seller, hidden: false});

        const page = await shopProduct();
        expect(page.body.error_code).toBe("product_not_found");
        const filter = await asSeller(() => buildShopCatalogFilter({companyId: seller, search: "Mug"}));
        expect(await asSeller(() => Product.countDocuments(filter ?? {}))).toBe(0);
        // The shop's staff still see it in the panel.
        expect((await asSeller(() => Product.findById(mug).lean()))?.hiddenByPlatform).toBe(true);
    });
});
