import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import {MongoMemoryReplSet} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
const {deletedFiles} = vi.hoisted(() => ({deletedFiles: [] as string[]}));
vi.mock("@coreModule/utilities/gridfs/gridfsStorage", () => ({
    getGridFSStorage: () => ({deleteFile: async (id: string) => void deletedFiles.push(id)}),
}));

import {appFor, callerHeader, type TestCaller} from "@coreModule/_tests/httpHarness";
import * as privacyRoute from "@coreModule/api/company/private/privacy";
import {loadPersonErasers} from "@coreModule/utilities/erasure/personErasure";
import {asCrossTenant} from "@coreModule/utilities/endpoints/tenantScope";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import CustomerAddress from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";

let replSet: MongoMemoryReplSet;
const company = new ObjectId();
const accountId = new ObjectId();
const otherAccountId = new ObjectId();
const EMAIL = "ada@example.com";
const app = appFor([{...privacyRoute, module: "core"}]);
const admin: TestCaller = {userId: new ObjectId().toString(), companyId: company.toString(), isAdmin: true, modules: ["core", "finance", "eCommerce"]};
const ids = {order: new ObjectId(), otherOrder: new ObjectId(), pos: new ObjectId()};
const address = (firstName: string) => ({firstName, lastName: "L", phone: "+41 1", street: "Bahnhofstrasse 1", city: "Zurich", postalCode: "8001", country: "CH"});
const raw = <T>(fn: () => Promise<T>) => asCrossTenant("test reads raw collections", fn);

beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({replSet: {count: 1, storageEngine: "wiredTiger"}});
    await mongoose.connect(replSet.getUri());
    // Every module's eraser (and so its models) first, then every index: a collection or index created while the
    // erasure's transaction is open aborts it.
    await loadPersonErasers();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    await raw(async () => {
        const {default: User} = await import("@coreModule/database/schemas/user/user");
        await User.collection.insertMany([{_id: accountId, username: EMAIL}, {_id: otherAccountId, username: "marco@example.com"}]);
        await ProductOrder.collection.insertMany([
            {_id: ids.order, company, orderNumber: "SO-1", idempotencyKey: "k-1", customer: accountId, email: EMAIL, phone: "+41 1", grandTotal: 99, notes: "ring twice", shippingAddress: address("Ada"), billingAddress: address("Ada"), deletedAt: null},
            {_id: ids.otherOrder, company, orderNumber: "SO-2", idempotencyKey: "k-2", customer: otherAccountId, email: "marco@example.com", grandTotal: 10, shippingAddress: address("Marco"), deletedAt: null},
        ]);
        await PosOrder.collection.insertOne({_id: ids.pos, company, name: "POS-1", customer: accountId, customerName: "Ada Lovelace", amountTotal: 20, deletedAt: null});
        await Cart.collection.insertMany([{company, user: accountId, items: [], deletedAt: null}, {company, user: otherAccountId, items: [], deletedAt: null}]);
        await CustomerAddress.collection.insertOne({company, customer: accountId, ...address("Ada"), deletedAt: null});
        await SavedSearch.collection.insertOne({company, customer: accountId, name: "red shoes", deletedAt: null});
    });
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
});

describe("person erasure in a shop (D57)", {timeout: 60000}, () => {
    it("keeps orders for accounting without the person, deletes what is only theirs, and leaves other customers alone", async () => {
        const erased = await request(app).post("/api/privacy/erasePerson").set(callerHeader(admin)).send({email: EMAIL, preview: false});
        expect(erased.body.error_code ?? "ok").toBe("ok");

        const order = (await raw(() => ProductOrder.collection.findOne({_id: ids.order})))!;
        expect(order).toMatchObject({orderNumber: "SO-1", grandTotal: 99});
        for (const field of ["email", "phone", "notes"]) expect(order[field]).toBeUndefined();
        for (const path of ["shippingAddress", "billingAddress"]) {
            expect(order[path]).toEqual({firstName: "Erased", lastName: "person", street: "-", city: "Zurich", postalCode: "8001", country: "CH"});
        }
        const pos = (await raw(() => PosOrder.collection.findOne({_id: ids.pos})))!;
        expect(pos.customer).toBeUndefined();
        expect(pos.customerName).toBeUndefined();
        expect(await raw(() => Cart.collection.countDocuments({user: accountId}))).toBe(0);
        expect(await raw(() => CustomerAddress.collection.countDocuments({}))).toBe(0);
        expect(await raw(() => SavedSearch.collection.countDocuments({}))).toBe(0);

        expect((await raw(() => ProductOrder.collection.findOne({_id: ids.otherOrder})))).toMatchObject({email: "marco@example.com", shippingAddress: {firstName: "Marco", street: "Bahnhofstrasse 1"}});
        expect(await raw(() => Cart.collection.countDocuments({user: otherAccountId}))).toBe(1);
    });
});
