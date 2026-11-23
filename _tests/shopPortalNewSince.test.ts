import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

vi.hoisted(() => {
    process.env.ENABLED_MODULES = "core,finance,eCommerce";
});

import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {clearPortalProviders, getPortalProvider} from "@coreModule/domain/portal/portalProviderRegistry";
import type {PortalNewSinceContext} from "@coreModule/domain/portal/portalProvider.types";
import Product from "@eCommerceModule/database/schemas/product/product";
import {registerShopPortalProvider} from "@eCommerceModule/domain/portal/shopPortalProvider";

/* D178, P23.7: the shop answers "which products were added after a date". */

const seller = new ObjectId();
const since = new Date("2026-11-01T00:00:00Z");
const products = {lamp: new ObjectId(), chair: new ObjectId(), old: new ObjectId(), draft: new ObjectId()};

function newSince(fields: Partial<PortalNewSinceContext> = {}) {
    const provider = getPortalProvider("shop");
    if (!provider?.newSince) throw new Error("the shop must answer newSince");
    const ask = provider.newSince;
    return withTenant(seller, () => ask({kind: "product", scope: {companyId: seller}, companyIds: [seller], filters: {}, since, limit: 10, languageCode: "en-US", ...fields}));
}

beforeAll(async () => {
    await connectTestDatabase();
    registerShopPortalProvider();
}, 120000);

afterAll(async () => {
    clearPortalProviders();
    await disconnectTestDatabase();
});

beforeEach(async () => {
    const db = mongoose.connection.db!;
    for (const collection of await db.collections()) await collection.deleteMany({});
    await db.collection("companies").insertOne({_id: seller, name: "Adria Home", siteSlug: "adria", isActive: true, modules: ["core", "finance", "eCommerce"], deletedAt: null});
    const product = (_id: ObjectId, title: string, createdAt: Date, extra: Record<string, unknown> = {}) => ({
        _id, company: seller, title, slug: title.toLowerCase().replace(/ /g, "-"), price: 30, status: "active", deletedAt: null, createdAt, ...extra,
    });
    await Product.collection.insertMany([
        product(products.lamp, "Desk lamp", new Date("2026-11-03T00:00:00Z"), {price: 45}),
        product(products.chair, "Chair", new Date("2026-11-02T00:00:00Z"), {price: 120}),
        product(products.old, "Old lamp", new Date("2026-10-01T00:00:00Z")),
        product(products.draft, "Draft lamp", new Date("2026-11-04T00:00:00Z"), {status: "draft"}),
    ]);
});

describe("products new since a date (P23.7)", () => {
    it("lists the active products added after the date, newest first, with the saved words and price", async () => {
        const all = await newSince();
        expect(all.total).toBe(2);
        expect(all.items.map((item) => item.title)).toEqual(["Desk lamp", "Chair"]);
        expect(all.items[0]).toEqual(expect.objectContaining({kind: "product", id: products.lamp.toString(), section: "shop"}));

        expect((await newSince({query: "lamp"})).items.map((item) => item.title)).toEqual(["Desk lamp"]);
        expect((await newSince({priceMin: 100})).items.map((item) => item.title)).toEqual(["Chair"]);
    });

    it("shows the products a person keeps as listed now, old ones included, but not unpublished ones", async () => {
        const kept = await newSince({since: new Date(0), ids: [products.old.toString(), products.draft.toString()]});
        expect(kept.items.map((item) => item.title)).toEqual(["Old lamp"]);
    });
});
