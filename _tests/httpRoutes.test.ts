import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
vi.mock("@eCommerceModule/utilities/services/productOrderNotify", () => ({
    notifyProductOrderCustomer: vi.fn(async () => undefined),
    notifyMerchantsNewOrder: vi.fn(async () => undefined),
    notifyMerchantsLowStock: vi.fn(async () => undefined),
    notifyAbandonedCartEmail: vi.fn(async () => undefined),
}));

import {allPermissionTags, appFor, callerHeader, type TestCaller} from "@coreModule/_tests/httpHarness";
import AuditLog from "@coreModule/database/schemas/auditLog/auditLog";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import {requestContext} from "@coreModule/utilities/endpoints/requestContext";
import * as inventoryRoute from "@eCommerceModule/api/eCommerce/private/inventory";
import * as warehouseRoute from "@eCommerceModule/api/eCommerce/private/checked/warehouse";
import * as productRoute from "@eCommerceModule/api/eCommerce/private/checked/product";
import * as productOrderRoute from "@eCommerceModule/api/eCommerce/private/productOrder";
import * as posRoute from "@eCommerceModule/api/eCommerce/private/pos";
import * as fiscalRoute from "@eCommerceModule/api/eCommerce/private/fiscal";
import * as customerGroupRoute from "@eCommerceModule/api/eCommerce/private/checked/customerGroup";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import Currency from "@coreModule/database/schemas/currency/currency";
import {asCrossTenant, withTenant} from "@coreModule/utilities/endpoints/tenantScope";

const companyId = new ObjectId();
/** The tests act on this company's data, as its requests and jobs do (D16). */
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(companyId, fn);
const userId = new ObjectId();
// eCommerce routes run with tenant scoping enforced (D16), as in the dev profiles.
const app = appFor([inventoryRoute, warehouseRoute, productRoute, productOrderRoute, posRoute, fiscalRoute, customerGroupRoute].map((route) => ({...route, module: "eCommerce"})));

let admin: TestCaller;
const webClient: TestCaller = {userId: userId.toString(), companyId: companyId.toString(), permissions: []};

beforeAll(async () => {
    await connectTestDatabase();
    // Every registered model (audit log, …): a collection or index built inside a transaction aborts it.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    admin = {
        userId: userId.toString(),
        companyId: companyId.toString(),
        isAdmin: true,
        permissions: allPermissionTags([Inventory, Warehouse, Product, ProductOrder, CustomerGroup, CustomerGroupMember, PosOrder]),
    };
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCompany(async () => {
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
}));

async function seedWarehouse(code = `W${new ObjectId().toString().slice(-6)}`) {
    return Warehouse.create({name: code, code, company: companyId, isActive: true} as any);
}

async function seedProduct() {
    const suffix = new ObjectId().toString().slice(-6);
    return Product.create({title: `P ${suffix}`, slug: `p-${suffix}`, type: "physical", status: "active", price: 100, company: companyId} as any);
}

describe("delete guards over HTTP", {timeout: 30000}, () => {
    it("refuse a warehouse or stock row that still holds stock", () => asCompany(async () => {
        const warehouse = await seedWarehouse();
        const product = await seedProduct();
        const row = await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: 2, quantityReserved: 0, company: companyId});

        const warehouseDelete = await request(app).delete("/api/eCommerce/warehouse").set(callerHeader(admin)).send({_id: warehouse._id.toString()});
        expect([warehouseDelete.status, warehouseDelete.body.error_code]).toEqual([400, "warehouse_has_stock"]);

        const rowDelete = await request(app).delete("/api/eCommerce/inventory").set(callerHeader(admin)).send({_id: row._id.toString()});
        expect([rowDelete.status, rowDelete.body.error_code]).toEqual([400, "inventory_has_stock"]);
        expect(await Inventory.countDocuments({deletedAt: null})).toBe(1);
    }));

    it("refuse deleting a row twice, admins included", () => asCompany(async () => {
        const warehouse = await seedWarehouse();
        const product = await seedProduct();
        const row = await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: 0, quantityReserved: 0, company: companyId});

        const first = await request(app).delete("/api/eCommerce/inventory").set(callerHeader(admin)).send({_id: row._id.toString()});
        expect(first.status).toBe(200);
        const deletedAt = (await Inventory.findById(row._id).withDeleted())!.deletedAt;

        const again = await request(app).delete("/api/eCommerce/inventory").set(callerHeader(admin)).send({_id: row._id.toString()});
        expect(again.body.error_code).toBe("inventory_not_found");
        expect((await Inventory.findById(row._id).withDeleted())!.deletedAt).toEqual(deletedAt);
    }));

    it("count only live references, for admins too (E-17)", () => asCompany(async () => {
        const warehouse = await seedWarehouse();
        const product = await seedProduct();
        const row = await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: 0, quantityReserved: 0, company: companyId});
        const asAdmin = (check: () => Promise<void>) =>
            // An admin's request, tenant included as authMW sets it (D16).
            requestContext.run({actionUserCtx: {userId: admin.userId, orgId: admin.companyId, isAdmin: true, permissions: [], isSelf: true}, tenantCompanyId: admin.companyId}, check);

        await expect(asAdmin(() => assertCanDelete("Warehouse", warehouse._id, "en-US")))
            .rejects.toMatchObject({error_code: "cannot_delete_has_relations"});
        await Inventory.updateOne({_id: row._id}, {$set: {deletedAt: new Date()}});
        await expect(asAdmin(() => assertCanDelete("Warehouse", warehouse._id, "en-US"))).resolves.toBeUndefined();
    }));

    it("refuse a pending order that still holds stock", () => asCompany(async () => {
        const product = await seedProduct();
        const warehouse = await seedWarehouse();
        const order = await ProductOrder.create({
            company: companyId, orderNumber: "ORD-H-1", customer: userId, currency: new ObjectId(),
            idempotencyKey: `k-${new ObjectId().toString()}`, status: "pending", paymentStatus: "unpaid",
            items: [{product: product._id, quantity: 1, unitPrice: 10, totalPrice: 10, snapshot: {title: "a"}}],
            reservations: [{product: product._id, warehouse: warehouse._id, quantity: 1, state: "reserved"}],
            subtotal: 10, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10,
            shippingAddress: {firstName: "A", lastName: "B", street: "S", city: "C"},
        } as any);

        const response = await request(app).delete("/api/eCommerce/productOrder").set(callerHeader(admin)).send({_id: order._id.toString()});
        expect([response.status, response.body.error_code]).toEqual([400, "order_must_be_cancelled_first"]);
    }));
});

describe("customer group delete and restore over HTTP (#13)", {timeout: 30000}, () => {
    it("brings back the members the delete removed, but not one re-added since", () => asCompany(async () => {
        const group = await CustomerGroup.create({name: "VIP", company: companyId} as any);
        const [stays, readded] = [new ObjectId(), new ObjectId()];
        await CustomerGroupMember.create([
            {customerGroup: group._id, user: stays, company: companyId},
            {customerGroup: group._id, user: readded, company: companyId},
        ] as any);

        const deleted = await request(app).delete("/api/eCommerce/customerGroup").set(callerHeader(admin)).send({_id: group._id.toString()});
        expect(deleted.status).toBe(200);
        expect(await CustomerGroupMember.countDocuments({customerGroup: group._id, deletedAt: null})).toBe(0);
        await CustomerGroupMember.create({customerGroup: group._id, user: readded, company: companyId} as any);

        const restored = await request(app).patch("/api/eCommerce/customerGroup/restore").set(callerHeader(admin)).send({_id: group._id.toString()});
        expect(restored.status).toBe(200);
        const live = await CustomerGroupMember.find({customerGroup: group._id, deletedAt: null});
        expect(live.map(member => member.get("user").toString()).sort()).toEqual([stays.toString(), readded.toString()].sort());
    }));
});

describe("permission gates over HTTP", {timeout: 30000}, () => {
    it("refuse till, fiscal and customer-group calls from a user without the tags", () => asCompany(async () => {
        const id = new ObjectId().toString();
        const calls: [string, Record<string, string>][] = [
            ["/api/eCommerce/pos/currentSession", {configId: id}],
            ["/api/eCommerce/fiscal/fiscalizePosOrder", {posOrderId: id, fiscalConfigId: id}],
            ["/api/eCommerce/customerGroup/addMember", {customerGroup: id, userId: id}],
        ];
        for (const [path, body] of calls) {
            const response = await request(app).post(path).set(callerHeader(webClient)).send(body);
            expect(response.body.error_code, path).toBe("user_permissions_not_sufficient");
        }
    }));
});

describe("PATCH writes (E-14)", {timeout: 30000}, () => {
    it("audits an edit with its diff and actor", () => asCompany(async () => {
        const product = await seedProduct();

        const response = await request(app).patch("/api/eCommerce/product").set(callerHeader(admin)).send({_id: product._id.toString(), title: product.title, type: "physical", price: 120});
        expect(response.status).toBe(200);

        const entry = await AuditLog.findOne({documentId: product._id, action: "UPDATE"});
        expect(entry!.diff.price).toEqual({from: 100, to: 120});
        expect(entry!.actorId!.toString()).toBe(userId.toString());
    }));

    it("answers a duplicate key with a 400, not a 500", () => asCompany(async () => {
        await seedWarehouse("MAIN");
        const other = await seedWarehouse("SIDE");

        const response = await request(app).patch("/api/eCommerce/warehouse").set(callerHeader(admin)).send({_id: other._id.toString(), name: other.name, code: "MAIN"});
        expect([response.status, response.body.error_code]).toEqual([400, "warehouse_already_exists"]);
    }));
});

describe("references to a platform list cross companies (D104, D160)", {timeout: 30000}, () => {
    const seedCurrency = (company: ObjectId) => asCrossTenant("test fixture", () =>
        Currency.create({name: "Euro", abbreviation: "EUR", symbol: "€", decimalPlaces: 2, company} as any));

    it("stores a product in the platform's currency, a row another company owns (D160)", () => asCompany(async () => {
        const platformEuro = await seedCurrency(new ObjectId());
        const product = {title: "Ref check", slug: "ref-check", type: "physical", status: "active", price: 10};

        const created = await request(app).put("/api/eCommerce/product").set(callerHeader(admin)).send({...product, currency: platformEuro._id.toString()});
        expect([created.status, created.body.error_code]).toEqual([200, undefined]);
        const stored = await Product.findOne({slug: "ref-check"});
        expect(stored!.get("currency")!.toString()).toBe(platformEuro._id.toString());
    }));
});

describe("concurrent requests (#8)", {timeout: 60000}, () => {
    it("records one payment when markPaid is sent twice at once", () => asCompany(async () => {
        const order = await ProductOrder.create({
            company: companyId, orderNumber: "ORD-C-1", customer: userId, currency: new ObjectId(),
            idempotencyKey: `k-${new ObjectId().toString()}`, status: "pending", paymentStatus: "unpaid",
            items: [], subtotal: 10, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10,
            shippingAddress: {firstName: "A", lastName: "B", street: "S", city: "C"},
        } as any);
        const markPaid = () => request(app).post("/api/eCommerce/productOrder/markPaid").set(callerHeader(admin)).send({_id: order._id.toString()});

        // A role without the markPaid permission is stopped before the action (D14).
        const viewer: TestCaller = {...admin, isAdmin: false, permissions: admin.permissions!.filter((tag) => !tag.includes("[action:"))};
        const refused = await request(app).post("/api/eCommerce/productOrder/markPaid").set(callerHeader(viewer)).send({_id: order._id.toString()});
        expect(refused.body.error_code).toBe("user_permissions_not_sufficient");

        const responses = await Promise.all([markPaid(), markPaid()]);

        expect(responses.map(response => response.status).sort()).toEqual([200, 400]);
        expect(responses.find(response => response.status === 400)!.body.error_code).toBe("order_not_awaiting_payment");
        expect(await PaymentTransaction.countDocuments({sourceId: order._id, type: "charge"})).toBe(1);
    }));
});

describe("stock actions over HTTP", {timeout: 30000}, () => {
    it("restock changes the row it validated, by id", () => asCompany(async () => {
        const warehouse = await seedWarehouse();
        const product = await seedProduct();
        const row = await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: 4, quantityReserved: 0, company: companyId});

        const response = await request(app).post("/api/eCommerce/inventory/restock").set(callerHeader(admin)).send({_id: row._id.toString(), quantity: 3});
        expect(response.status).toBe(200);
        expect((await Inventory.findById(row._id))!.quantityOnHand).toBe(7);
        expect(await InventoryMovement.countDocuments({inventory: row._id, reason: "restock", quantity: 3})).toBe(1);
    }));
});
