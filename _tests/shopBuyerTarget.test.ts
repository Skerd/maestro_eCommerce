import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

vi.hoisted(() => {
    process.env.ENABLED_MODULES = "core,finance,eCommerce";
});
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import Company from "@coreModule/database/schemas/company/company";
import Product from "@eCommerceModule/database/schemas/product/product";
import {asCrossTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {PORTAL_ROOT_DOMAIN} from "@coreModule/environment";
import {portalBuyerTargetHasModule} from "@coreModule/utilities/security/portalBuyer";
import {shopSeller} from "@eCommerceModule/utilities/shop/shopBuyerTarget";

const platform = new ObjectId();
const store = new ObjectId();
let product: ObjectId;
const fixtures = <T>(fn: () => PromiseLike<T>): Promise<T> => asCrossTenant("test fixtures span companies", fn);

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => fixtures(async () => {
    for (const collection of await mongoose.connection.db!.collections()) await collection.deleteMany({});
    await Company.collection.insertMany([
        {_id: platform, name: "Platform", vat: "P-1", isPlatformOwner: true, isActive: true, modules: ["core"], deletedAt: null},
        {_id: store, name: "Store", vat: "S-1", isActive: true, modules: ["eCommerce"], deletedAt: null},
    ]);
    product = (await Product.collection.insertOne({name: "Mug", company: store, deletedAt: null})).insertedId;
}));

// TD-B189: a portal buyer's session company is the platform, which has no shop; the shop's buyer routes answer the
// module gate with a seller instead.
describe("the shop's portal buyer gate (TD-B189)", () => {
    const apex = PORTAL_ROOT_DOMAIN;

    it("names the product's seller, or any seller the portal may buy from", async () => {
        expect(String(await shopSeller({body: {productId: product.toString()}, params: {}}))).toBe(String(store));
        expect(String(await shopSeller({body: {}, params: {}}))).toBe(String(store));
    });

    it("lets an apex buyer reach the shop while a seller runs it, and refuses once none does", async () => {
        expect(await portalBuyerTargetHasModule(shopSeller, {body: {}, params: {}}, apex, "eCommerce")).toBe(true);
        await fixtures(() => Company.collection.updateOne({_id: store}, {$set: {isActive: false}}));
        expect(await portalBuyerTargetHasModule(shopSeller, {body: {}, params: {}}, apex, "eCommerce")).toBe(false);
    });
});
