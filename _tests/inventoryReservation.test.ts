import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {
    isStockTracked,
    OutOfStockError,
    releaseReservations,
    reserveCheckoutStock,
    trackedStockLines,
} from "@eCommerceModule/utilities/services/inventoryReservationService";

let mongod: MongoMemoryServer;

const companyId = new ObjectId();

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Inventory.init();
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await Promise.all([
        Inventory.deleteMany({}, {hard: true}),
        Warehouse.deleteMany({}, {hard: true}),
        Checkout.deleteMany({}),
        InventoryMovement.deleteMany({}, {hard: true}),
        Product.deleteMany({}, {hard: true}),
        ProductVariant.deleteMany({}, {hard: true}),
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

async function seedProduct(overrides: Record<string, unknown> = {}): Promise<ObjectId> {
    const suffix = new ObjectId().toString().slice(-6);
    const product = await Product.create({
        title: `Product ${suffix}`,
        slug: `product-${suffix}`,
        type: "physical",
        status: "active",
        price: 10,
        company: companyId,
        ...overrides,
    });
    return product._id as ObjectId;
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

describe("isStockTracked", () => {
    it("tracks physical and variable products unless the product or variant opts out", () => {
        expect(isStockTracked({type: "physical"})).toBe(true);
        expect(isStockTracked({type: "variable"}, {})).toBe(true);
        expect(isStockTracked({type: "physical", trackInventory: false})).toBe(false);
        expect(isStockTracked({type: "variable"}, {trackInventory: false})).toBe(false);
    });

    it("never tracks digital, service, gift card or bundle products", () => {
        for (const type of ["digital", "service", "gift_card", "bundle"] as const) {
            expect(isStockTracked({type})).toBe(false);
        }
    });
});

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

describe("inventoryService direct stock moves and sale reversal", () => {
    it("takeStock takes only free stock unless overselling, which creates a missing row", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        const row = await seedInventory(warehouse._id, productId, 5, 3);
        const key = {product: productId, warehouse: warehouse._id, company: companyId};

        expect(await inventoryService.takeStock(key, 3, false, {})).toBeNull();
        expect((await inventoryService.takeStock(key, 2, false, {}))!.quantityOnHand).toBe(3);

        const elsewhere = await seedWarehouse();
        const oversold = await inventoryService.takeStock({...key, warehouse: elsewhere._id}, 2, true, {});
        expect(oversold!.quantityOnHand).toBe(-2);
        expect((await Inventory.findById(row._id))!.quantityReserved).toBe(3);
    });

    it("addStock puts units back, creating the row and linking it to the product", async () => {
        const productId = await seedProduct();
        const warehouse = await seedWarehouse();

        const row = await inventoryService.addStock({product: productId, warehouse: warehouse._id, company: companyId}, 2, {});

        expect([row.quantityOnHand, row.quantityReserved]).toEqual([2, 0]);
        expect((await Product.findById(productId))!.inventories!.map(String)).toEqual([row._id.toString()]);
    });

    it("reverseSale returns sold units on hand and holds them again", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 4, 0);

        const row = await inventoryService.reverseSale(productId, undefined, warehouse._id, 2, {});

        expect([row!.quantityOnHand, row!.quantityReserved]).toEqual([6, 2]);
    });
});

describe("unique stock key", () => {
    it("allows one live row per product / variant / warehouse, but a replacement for a deleted one", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        const first = await seedInventory(warehouse._id, productId, 1);

        await expect(seedInventory(warehouse._id, productId, 1)).rejects.toMatchObject({code: 11000});

        await Inventory.updateOne({_id: first._id}, {$set: {deletedAt: new Date()}});
        await expect(seedInventory(warehouse._id, productId, 1)).resolves.toBeTruthy();
    });
});

describe("reserveCheckoutStock", () => {
    it("prefers the default warehouse when it has stock", async () => {
        const productId = await seedProduct();
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
        const productId = await seedProduct();
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

    it("skips untracked lines: digital products and products that opt out", async () => {
        const digital = await seedProduct({type: "digital"});
        const optedOut = await seedProduct({trackInventory: false});
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, optedOut, 10);

        const reservations = await reserveCheckoutStock(
            [{product: digital, quantity: 3}, {product: optedOut, quantity: 3}],
            companyId,
            {},
        );

        expect(reservations).toHaveLength(0);
        expect((await Inventory.findOne({product: optedOut}))!.quantityReserved).toBe(0);
    });

    it("treats a tracked product without any stock row as out of stock", async () => {
        const productId = await seedProduct();

        await expect(
            reserveCheckoutStock([{product: productId, quantity: 1}], companyId, {}),
        ).rejects.toBeInstanceOf(OutOfStockError);
    });

    it("ignores stock in inactive or deleted warehouses", async () => {
        const productId = await seedProduct();
        const inactive = await seedWarehouse({isActive: false});
        const deleted = await seedWarehouse({deletedAt: new Date()});
        await seedInventory(inactive._id, productId, 10);
        await seedInventory(deleted._id, productId, 10);

        await expect(
            reserveCheckoutStock([{product: productId, quantity: 1}], companyId, {}),
        ).rejects.toBeInstanceOf(OutOfStockError);
    });

    it("splits a line across warehouses when none covers it alone, default first", async () => {
        const productId = await seedProduct();
        const other = await seedWarehouse();
        const defaultWarehouse = await seedWarehouse({isDefault: true});
        await seedInventory(other._id, productId, 4);
        await seedInventory(defaultWarehouse._id, productId, 3, 1);

        const reservations = await reserveCheckoutStock([{product: productId, quantity: 5}], companyId, {});

        expect(reservations.map(r => [r.warehouse.toString(), r.quantity])).toEqual([
            [defaultWarehouse._id.toString(), 2],
            [other._id.toString(), 3],
        ]);
        expect((await Inventory.findOne({warehouse: defaultWarehouse._id}))!.quantityReserved).toBe(3);
        expect((await Inventory.findOne({warehouse: other._id}))!.quantityReserved).toBe(3);
    });

    it("throws OutOfStockError when all warehouses together can't cover a line, holding nothing", async () => {
        const productId = await seedProduct();
        const first = await seedWarehouse();
        const second = await seedWarehouse();
        await seedInventory(first._id, productId, 2);
        await seedInventory(second._id, productId, 2);

        await expect(
            reserveCheckoutStock([{product: productId, quantity: 5}], companyId, {}),
        ).rejects.toBeInstanceOf(OutOfStockError);
        const rows = await Inventory.find({product: productId});
        expect(rows.map(row => row.quantityReserved)).toEqual([0, 0]);
    });
});

describe("trackedStockLines", () => {
    it("explodes bundles into their tracked components", async () => {
        const tracked = await seedProduct();
        const untracked = await seedProduct({type: "service"});
        const bundle = await seedProduct({
            type: "bundle",
            bundleComponents: [{product: tracked, quantity: 2}, {product: untracked, quantity: 1}],
        });

        const lines = await trackedStockLines([{product: bundle, quantity: 3}], companyId, {});

        expect(lines).toEqual([{product: tracked, quantity: 6}]);
    });

    it("respects a variant that opts out of tracking", async () => {
        const productId = await seedProduct({type: "variable", hasVariants: true});
        const variant = await ProductVariant.create({
            product: productId, sku: "V-1", price: 5, status: "active", trackInventory: false, company: companyId,
        });

        const lines = await trackedStockLines([{product: productId, variant: variant._id as ObjectId, quantity: 1}], companyId, {});

        expect(lines).toHaveLength(0);
    });
});

describe("releaseReservations", () => {
    it("returns held stock, idempotently, and leaves consumed holds alone", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        await seedInventory(warehouse._id, productId, 10, 4);

        const checkout = await makeCheckout([
            {product: productId, warehouse: warehouse._id, quantity: 4, state: "reserved"},
            {product: productId, warehouse: warehouse._id, quantity: 2, state: "consumed"},
        ]);

        await releaseReservations(checkout, {});
        await releaseReservations(checkout, {}); // second call must be a no-op

        const row = await Inventory.findOne({product: productId, warehouse: warehouse._id});
        expect(row!.quantityOnHand).toBe(10);
        expect(row!.quantityReserved).toBe(0);

        const reloaded = await Checkout.findById(checkout._id);
        expect(reloaded!.reservations!.map(r => r.state)).toEqual(["released", "consumed"]);
    });

    it("never takes reserved stock below zero", async () => {
        const productId = new ObjectId();
        const warehouse = await seedWarehouse();
        const row = await seedInventory(warehouse._id, productId, 10, 1);

        expect(await inventoryService.releaseReservation(productId, undefined, warehouse._id, 4, {})).toBe(true);

        expect((await Inventory.findById(row._id))!.quantityReserved).toBe(0);
    });
});
