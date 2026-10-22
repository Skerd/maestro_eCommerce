import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {MongoMemoryReplSet} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {runCheckoutExpiry} from "@eCommerceModule/utilities/cronJobs/checkoutExpiryJob";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";

// Expiry runs in transactions, which need a replica set
let replSet: MongoMemoryReplSet;
const companyId = new ObjectId();

beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({replSet: {count: 1}});
    await mongoose.connect(replSet.getUri());
    await Promise.all([Checkout.init(), Inventory.init(), Warehouse.init()]);
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
});

beforeEach(async () => {
    await Promise.all([
        Checkout.deleteMany({}),
        Inventory.deleteMany({}, {hard: true}),
        Warehouse.deleteMany({}, {hard: true}),
    ]);
});

afterEach(() => {
    vi.restoreAllMocks();
});

/** An overdue cash-on-delivery checkout holding 2 units. */
async function seedOverdueCodCheckout() {
    const productId = new ObjectId();
    const warehouse = await Warehouse.create({name: "Main", code: "MAIN", company: companyId, isActive: true, isDefault: true});
    const inventory = await Inventory.create({
        product: productId, warehouse: warehouse._id, quantityOnHand: 10, quantityReserved: 2, company: companyId,
    });
    const checkout = await Checkout.create({
        cart: new ObjectId(),
        company: companyId,
        currency: new ObjectId(),
        idempotencyKey: `test-${new ObjectId().toString()}`,
        status: "pending",
        paymentMethod: "cod",
        expiresAt: new Date(Date.now() - 60000),
        reservations: [{product: productId, warehouse: warehouse._id, quantity: 2, state: "reserved"}],
    });
    return {inventory, checkout};
}

// A fresh replica set can make the first transactions wait for a primary
describe("runCheckoutExpiry", {timeout: 30000}, () => {
    it("expires an overdue checkout and releases its hold", async () => {
        const {inventory, checkout} = await seedOverdueCodCheckout();

        await runCheckoutExpiry(companyId);

        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(0);
        const expired = await Checkout.findById(checkout._id);
        expect(expired!.status).toBe("expired");
        expect(expired!.reservations![0].state).toBe("released");
    });

    it("leaves a checkout alone when it was confirmed after the batch was loaded", async () => {
        const {inventory, checkout} = await seedOverdueCodCheckout();
        const stale = await Checkout.findById(checkout._id);
        // The buyer confirms (order placed, stock still held) while the job works on its stale copy
        await Checkout.updateOne({_id: checkout._id}, {$set: {status: "confirmed"}});
        const find = vi.spyOn(Checkout, "find").mockReturnValueOnce({limit: async () => [stale]} as any);

        await runCheckoutExpiry(companyId);

        expect(find).toHaveBeenCalledTimes(1);
        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(2);
        const confirmed = await Checkout.findById(checkout._id);
        expect(confirmed!.status).toBe("confirmed");
        expect(confirmed!.reservations![0].state).toBe("reserved");
    });

    it("rolls a checkout back whole when a release fails halfway, and releases each hold once on the next run (#11)", async () => {
        const {inventory, checkout} = await seedOverdueCodCheckout();
        const secondProduct = new ObjectId();
        const warehouseId = checkout.reservations![0].warehouse;
        const second = await Inventory.create({product: secondProduct, warehouse: warehouseId, quantityOnHand: 5, quantityReserved: 1, company: companyId});
        await Checkout.updateOne({_id: checkout._id}, {$push: {reservations: {product: secondProduct, warehouse: warehouseId, quantity: 1, state: "reserved"}}});

        const release = inventoryService.releaseReservation.bind(inventoryService);
        const spy = vi.spyOn(inventoryService, "releaseReservation")
            .mockImplementationOnce(release)
            .mockRejectedValueOnce(new Error("connection lost"));

        await runCheckoutExpiry(companyId);

        expect(spy).toHaveBeenCalledTimes(2);
        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(2);
        expect((await Inventory.findById(second._id))!.quantityReserved).toBe(1);
        const untouched = await Checkout.findById(checkout._id);
        expect([untouched!.status, ...untouched!.reservations!.map(r => r.state)]).toEqual(["pending", "reserved", "reserved"]);

        spy.mockRestore();
        await runCheckoutExpiry(companyId);

        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(0);
        expect((await Inventory.findById(second._id))!.quantityReserved).toBe(0);
        expect((await Checkout.findById(checkout._id))!.status).toBe("expired");
    });
});
