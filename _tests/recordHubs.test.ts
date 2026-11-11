import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

import {ObjectId} from "mongodb";
import request from "supertest";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import {allPermissionTags, appFor, callerHeader, type TestCaller} from "@coreModule/_tests/httpHarness";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import User from "@coreModule/database/schemas/user/user";
import * as productRoute from "@eCommerceModule/api/eCommerce/private/checked/product";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";

const companyId = new ObjectId();
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(companyId, fn);
const app = appFor([productRoute].map((route) => ({...route, module: "eCommerce"})));
const single = (caller: TestCaller, path: string, _id: ObjectId) =>
    request(app).post(`${path}/single`).set(callerHeader(caller)).send({_id: _id.toString()});

const customerId = new ObjectId();
const currencyId = new ObjectId();

let shopStaff: TestCaller;
let productsOnly: TestCaller;

beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([Product, ProductOrder].map((model) => model.init()));
    const caller = (userId: ObjectId, permissions: string[], isAdmin = false): TestCaller =>
        ({userId: userId.toString(), companyId: companyId.toString(), isAdmin, permissions, modules: ["core", "eCommerce"]});
    shopStaff = caller(new ObjectId(), allPermissionTags([Product, ProductOrder]));
    productsOnly = caller(new ObjectId(), allPermissionTags([Product]));
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCompany(async () => {
    await Promise.all([User, Product, ProductOrder].map((model) => model.collection.deleteMany({})));
    await User.collection.insertMany([
        {_id: customerId, username: "cam", name: "Cam", surname: "Customer", email: "cam@customer.test", companies: [companyId]},
    ]);
}));

async function productOrder(product: ObjectId, orderNumber: string, createdAt: string) {
    await ProductOrder.collection.insertOne({
        company: companyId, orderNumber, idempotencyKey: `key-${orderNumber}`, customer: customerId, currency: currencyId, status: "confirmed", paymentStatus: "paid",
        items: [{product, quantity: 1, unitPrice: 10, totalPrice: 10, snapshot: {title: "Mug"}}],
        subtotal: 10, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10,
        shippingAddress: {firstName: "Cam", lastName: "Customer", street: "Rruga 1", city: "Tirana"},
        createdAt: new Date(createdAt),
    });
}

describe("eCommerce sheets as hubs (P10.7)", () => {
    it("lists the shop orders a product is on for a role that may read orders, and leaves them out for one that may not", () => asCompany(async () => {
        const mug = await Product.create({title: "Mug", slug: "mug", type: "physical", status: "active", price: 10, company: companyId});
        const plate = await Product.create({title: "Plate", slug: "plate", type: "physical", status: "active", price: 12, company: companyId});
        await productOrder(mug._id, "ORD-1", "2026-11-01T09:00:00Z");
        await productOrder(mug._id, "ORD-2", "2026-11-05T09:00:00Z");
        await productOrder(plate._id, "ORD-3", "2026-11-06T09:00:00Z");

        const full = await single(shopStaff, "/api/eCommerce/product", mug._id);
        expect(full.status).toBe(200);
        // Newest first, this product's orders only.
        expect(full.body.orders.map((row: {orderNumber: string}) => row.orderNumber)).toEqual(["ORD-2", "ORD-1"]);

        const limited = await single(productsOnly, "/api/eCommerce/product", mug._id);
        expect(limited.status).toBe(200);
        expect(limited.body.title).toBe("Mug");
        expect(limited.body).not.toHaveProperty("orders");
    }));

});
