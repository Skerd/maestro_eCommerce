import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {
    consumeCheckoutReservations,
    OutOfStockError,
    releaseCheckoutReservations,
    reserveCheckoutStock,
} from "@eCommerceModule/utilities/services/inventoryReservationService";

let mongod: MongoMemoryServer;

const companyId = new ObjectId();

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await Promise.all([
        Inventory.deleteMany({}),
        Warehouse.deleteMany({}),
        Checkout.deleteMany({}),
        InventoryMovement.deleteMany({}),
    ]);
});

async function seedWarehouse(overrides: Record<string, unknown> = {}) {
    const suffix = new ObjectId().toString().slice(-6);
    return Warehouse.create({
        name: `WH-${suffix}`,
        code: `WH-${suffix}`,
        company: companyId,
        isActive: true,
        isDefault: false,
        ...overrides,
    });
}

async function seedInventory(warehouseId: ObjectId, productId: ObjectId, onHand: number, reserved = 0) {
    return Inventory.create({
        product: productId,
        warehouse: warehouseId,
        quantityOnHand: onHand,
        quantityReserved: reserved,
        company: companyId,
    });
}

function makeCheckout(reservations: any[] = []) {
    return Checkout.create({
        cart: new ObjectId(),
        company: companyId,
        currency: new ObjectId(),
        idempotencyKey: `test-${new ObjectId().toString()}`,
        status: "pending",
        expiresAt: new Date(Date.now() + 60000),
        reservations,
    });
}

describe("inventoryService.reserveStock", () => {
    it("does not oversell under concurrent reservations", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 5);

        const attempts = await Promise.all(
            Array.from({length: 4}, () =>
                inventoryService.reserveStock(productId, undefined, warehouse._id, 3, {}),
            ),
        );

        const succeeded = attempts.filter(Boolean);
        expect(succeeded).toHaveLength(1);

        const row = await Inventory.findOne({product: productId, warehouse: warehouse._id});
        expect(row!.quantityReserved).toBe(3);
        expect(row!.quantityOnHand).toBe(5);
    });

    it("fails when available (onHand - reserved) is insufficient", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 10, 8);

        const result = await inventoryService.reserveStock(productId, undefined, warehouse._id, 3, {});
        expect(result).toBeNull();
    });
});

describe("reserveCheckoutStock", () => {
    it("prefers the default warehouse when it has stock", async () => {
        const productId = new ObjectId();
        const otherWarehouse = await seedWarehouse();
        const defaultWarehouse = await seedWarehouse({isDefault: true});
        await seedInventory(otherWarehouse._id, productId, 10);
        await seedInventory(defaultWarehouse._id, productId, 10);

        const reservations = await reserveCheckoutStock(
            [{product: productId, quantity: 2}],
            companyId,
            {},
        );

        expect(reservations).toHaveLength(1);
        expect(reservations[0].warehouse.toString()).toBe(defaultWarehouse._id.toString());
        expect(reservations[0].state).toBe("reserved");
    });

    it("falls back to another warehouse when the default lacks stock", async () => {
        const productId = new ObjectId();
        const defaultWarehouse = await seedWarehouse({isDefault: true});
        const otherWarehouse = await seedWarehouse();
        await seedInventory(defaultWarehouse._id, productId, 1);
        await seedInventory(otherWarehouse._id, productId, 10);

        const reservations = await reserveCheckoutStock(
            [{product: productId, quantity: 5}],
            companyId,
            {},
        );

        expect(reservations[0].warehouse.toString()).toBe(otherWarehouse._id.toString());
    });

    it("skips lines with no inventory records (untracked products)", async () => {
        const reservations = await reserveCheckoutStock(
            [{product: new ObjectId(), quantity: 3}],
            companyId,
            {},
        );
        expect(reservations).toHaveLength(0);
    });

    it("throws OutOfStockError when no warehouse can cover a tracked line", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 2);

        await expect(
            reserveCheckoutStock([{product: productId, quantity: 5}], companyId, {}),
        ).rejects.toBeInstanceOf(OutOfStockError);
    });
});

describe("consume / release reservations", () => {
    it("consumeCheckoutReservations converts holds to sales with movement rows, idempotently", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 10, 4);

        const checkout = await makeCheckout([
            {product: productId, warehouse: warehouse._id, quantity: 4, state: "reserved"},
        ]);

        await consumeCheckoutReservations(checkout, {});
        await consumeCheckoutReservations(checkout, {}); // second call must be a no-op

        const row = await Inventory.findOne({product: productId, warehouse: warehouse._id});
        expect(row!.quantityOnHand).toBe(6);
        expect(row!.quantityReserved).toBe(0);

        const movements = await InventoryMovement.find({product: productId});
        expect(movements).toHaveLength(1);
        expect(movements[0].reason).toBe("sale");
        expect(movements[0].quantity).toBe(-4);
        expect(movements[0].quantityBefore).toBe(10);
        expect(movements[0].quantityAfter).toBe(6);

        const reloaded = await Checkout.findById(checkout._id);
        expect(reloaded!.reservations![0].state).toBe("consumed");
    });

    it("releaseCheckoutReservations returns held stock, idempotently", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 10, 4);

        const checkout = await makeCheckout([
            {product: productId, warehouse: warehouse._id, quantity: 4, state: "reserved"},
        ]);

        await releaseCheckoutReservations(checkout, {});
        await releaseCheckoutReservations(checkout, {}); // second call must be a no-op

        const row = await Inventory.findOne({product: productId, warehouse: warehouse._id});
        expect(row!.quantityOnHand).toBe(10);
        expect(row!.quantityReserved).toBe(0);

        const reloaded = await Checkout.findById(checkout._id);
        expect(reloaded!.reservations![0].state).toBe("released");
    });
});
