import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";
import {allPermissionTags, appFor, callerHeader, type TestCaller} from "@coreModule/_tests/httpHarness";
import {asCrossTenant} from "@coreModule/utilities/endpoints/tenantScope";
import UserAddress from "@coreModule/database/schemas/userAddress/userAddress";
import * as productOrderRoute from "@eCommerceModule/api/eCommerce/private/productOrder";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";

const platform = new ObjectId();
const shop = new ObjectId();
const otherShop = new ObjectId();
const buyer = new ObjectId();
const otherShopsBuyer = new ObjectId();
const app = appFor([{...productOrderRoute, basePath: "/api/eCommerce/productOrder"}]);
const tag = allPermissionTags([ProductOrder]).filter((permission) => permission.includes("customerAddresses"));
const staff: TestCaller = {userId: new ObjectId().toString(), companyId: shop.toString(), permissions: tag, modules: ["core", "finance", "eCommerce"]};
// A buyer who also holds a role in the shop, without the staff permission.
const roleWithoutTag: TestCaller = {userId: buyer.toString(), companyId: shop.toString(), permissions: [], modules: ["core", "finance", "eCommerce"]};
const raw = <T>(fn: () => Promise<T>) => asCrossTenant("test fixtures span companies", fn);
const address = (user: ObjectId, firstName: string) => ({
    company: platform, user, type: "shipping", firstName, lastName: "L", street: "Main 1", city: new ObjectId(), country: new ObjectId(),
    latitude: 0, longitude: 0, isDefault: false, deletedAt: null,
});
const list = (who: TestCaller) => request(app).post("/api/eCommerce/productOrder/customerAddresses").set(callerHeader(who)).send({offset: 0, limit: 20});

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => raw(async () => {
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
    await mongoose.connection.db!.collection("companies").insertOne({_id: platform, name: "Platform", vat: "CHE-1", isPlatformOwner: true, isActive: true});
    await ProductOrder.collection.insertMany([
        {company: shop, orderNumber: "SO-1", idempotencyKey: "k-1", customer: buyer, grandTotal: 10, deletedAt: null},
        {company: otherShop, orderNumber: "SO-2", idempotencyKey: "k-2", customer: otherShopsBuyer, grandTotal: 10, deletedAt: null},
    ]);
    await UserAddress.collection.insertMany([address(buyer, "Home"), address(buyer, "Work"), address(otherShopsBuyer, "Elsewhere")]);
}));

describe("a shop's staff reading its buyers' address books (D163)", () => {
    it("lists every saved address of the people who ordered from the shop, and nobody else's", async () => {
        const listed = await list(staff);
        expect(listed.body.error_code ?? "ok").toBe("ok");
        expect(listed.body.total).toBe(2);
        expect(listed.body.data.map((a: {firstName: string}) => a.firstName).sort()).toEqual(["Home", "Work"]);
    });

    it("is refused without the staff permission, even to a buyer with a role in the shop", async () => {
        const refused = await list(roleWithoutTag);
        expect([refused.status, refused.body.error_code]).toEqual([403, "user_permissions_not_sufficient"]);
    });
});
