import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import {getLogger} from "@coreModule/loggers/serverLog";
import Product from "@eCommerceModule/database/schemas/product/product";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import StockTransfer from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import StockCount from "@eCommerceModule/database/schemas/stockCount/stockCount";
import {StockTransferActions} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer.actions";
import {StockCountActions} from "@eCommerceModule/database/schemas/stockCount/stockCount.actions";
import {stockCountService} from "@eCommerceModule/database/schemas/stockCount/stockCount.service";
import {InventoryActions} from "@eCommerceModule/database/schemas/inventory/inventory.actions";
import {assertStockDocumentLines} from "@eCommerceModule/utilities/services/stockDocumentLines";
import {productOrderLinesToSelect} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.select";
import {attachOrderLineProductCopy} from "@eCommerceModule/utilities/mappers/productOrder/orderLineDisplay";

let mongod: MongoMemoryServer;
const companyId = new ObjectId();
const userId = new ObjectId();
const lang = "en-US";
const logger = getLogger("stock_documents_test");
const base = {logger, languageCode: lang, company: {_id: companyId}};

const staff = (permissions: string[]) => ({
    ...base,
    actionUserCtx: {userId: userId.toString(), isAdmin: false, isSelf: true, permissions},
}) as any;

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
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
});

let seq = 0;
async function seedProduct(overrides: Record<string, unknown> = {}) {
    seq += 1;
    return Product.create({
        title: `Product ${seq}`, slug: `product-${seq}-${new ObjectId().toString().slice(-6)}`,
        type: "physical", status: "active", price: 10, company: companyId, ...overrides,
    } as any);
}

async function seedWarehouse() {
    const code = `W${new ObjectId().toString().slice(-6)}`;
    return Warehouse.create({name: code, code, company: companyId, isActive: true} as any);
}

async function seedRow(product: any, warehouse: any, onHand: number, reserved = 0) {
    return Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: onHand, quantityReserved: reserved, company: companyId});
}

const stockOf = async (product: any, warehouse: any) => {
    const row = await Inventory.findOne({product: product._id, warehouse: warehouse._id});
    return row ? [row.quantityOnHand, row.quantityReserved] : null;
};

describe("stock document lines", () => {
    it("accept distinct tracked items of the company and refuse duplicates, bundles and foreign warehouses", async () => {
        const product = await seedProduct();
        const bundle = await seedProduct({type: "bundle", bundleComponents: [{product: product._id, quantity: 1}]});
        const warehouse = await seedWarehouse();
        const foreign = await Warehouse.create({name: "X", code: "XFOREIGN", company: new ObjectId(), isActive: true} as any);

        await expect(assertStockDocumentLines([{product: product._id}], [warehouse._id], base as any)).resolves.toBeUndefined();
        await expect(assertStockDocumentLines([{product: product._id}, {product: product._id}], [warehouse._id], base as any))
            .rejects.toMatchObject({error_code: "stock_line_duplicate"});
        await expect(assertStockDocumentLines([{product: bundle._id}], [warehouse._id], base as any))
            .rejects.toMatchObject({error_code: "stock_line_not_tracked"});
        await expect(assertStockDocumentLines([{product: product._id}], [foreign._id], base as any))
            .rejects.toMatchObject({error_code: "inventory_reference_invalid"});
    });
});

describe("stock transfers", () => {
    const mover = staff(["stocktransfers[write:status]"]);

    async function seedTransfer(product: any, from: any, to: any, quantity: number) {
        return StockTransfer.create({fromWarehouse: from._id, toWarehouse: to._id, lines: [{product: product._id, quantity}], company: companyId} as any);
    }

    it("moves free stock with paired movements, creating the destination row", async () => {
        const product = await seedProduct();
        const from = await seedWarehouse();
        const to = await seedWarehouse();
        await seedRow(product, from, 10, 3);
        const transfer = await seedTransfer(product, from, to, 5);

        await new StockTransferActions().complete({...mover, _id: transfer._id.toString()});

        expect(await stockOf(product, from)).toEqual([5, 3]);
        expect(await stockOf(product, to)).toEqual([5, 0]);
        const destination = await Inventory.findOne({warehouse: to._id});
        expect((await Product.findById(product._id))!.inventories!.map(String)).toContain(destination!._id.toString());
        const moves = await InventoryMovement.find({referenceId: transfer._id}).sort({quantity: 1});
        expect(moves.map(move => [move.reason, move.quantity])).toEqual([["transfer_out", -5], ["transfer_in", 5]]);
        expect((await StockTransfer.findById(transfer._id))!.status).toBe("done");

        await expect(new StockTransferActions().complete({...mover, _id: transfer._id.toString()}))
            .rejects.toMatchObject({error_code: "stock_document_not_draft"});
    });

    it("never moves stock held for orders, and needs the status permission", async () => {
        const product = await seedProduct();
        const from = await seedWarehouse();
        const to = await seedWarehouse();
        await seedRow(product, from, 10, 3);
        const transfer = await seedTransfer(product, from, to, 8);

        await expect(new StockTransferActions().complete({...staff([]), _id: transfer._id.toString()}))
            .rejects.toMatchObject({error_code: "user_permissions_not_sufficient"});
        await expect(new StockTransferActions().complete({...mover, _id: transfer._id.toString()}))
            .rejects.toMatchObject({error_code: "insufficient_stock"});
        expect(await stockOf(product, from)).toEqual([10, 3]);

        await new StockTransferActions().cancel({...mover, _id: transfer._id.toString()});
        expect((await StockTransfer.findById(transfer._id))!.status).toBe("cancelled");
    });
});

describe("stock counts", () => {
    it("snapshots the warehouse and sets on-hand to the count against on-hand now", async () => {
        const counted = await seedProduct();
        const untouched = await seedProduct();
        const found = await seedProduct();
        const warehouse = await seedWarehouse();
        await seedRow(counted, warehouse, 10, 2);
        await seedRow(untouched, warehouse, 4);

        const snapshot = await stockCountService.countLines(warehouse._id, undefined, [], base as any);
        expect(snapshot.map(line => [String(line.product), line.expectedQuantity]))
            .toEqual([[counted._id.toString(), 10], [untouched._id.toString(), 4]]);

        const lines = await stockCountService.countLines(
            warehouse._id,
            [{product: counted._id, countedQuantity: 7}, {product: untouched._id}, {product: found._id, countedQuantity: 2}],
            snapshot as any,
            base as any,
        );
        expect(lines.map(line => line.expectedQuantity)).toEqual([10, 4, 0]);
        const count = await StockCount.create({warehouse: warehouse._id, lines, company: companyId} as any);

        // A unit leaves while the count is open: the count still wins, without undoing that sale
        await Inventory.updateOne({product: counted._id}, {$inc: {quantityOnHand: -1}});
        await new StockCountActions().apply({...staff(["stockcounts[write:status]"]), _id: count._id.toString()});

        expect(await stockOf(counted, warehouse)).toEqual([7, 2]);
        expect(await stockOf(untouched, warehouse)).toEqual([4, 0]);
        expect(await stockOf(found, warehouse)).toEqual([2, 0]);
        const moves = await InventoryMovement.find({referenceId: count._id}).sort({quantity: 1});
        expect(moves.map(move => [move.reason, move.quantity, move.quantityAfter])).toEqual([["adjustment", -2, 7], ["adjustment", 2, 2]]);
        expect((await StockCount.findById(count._id))!.status).toBe("applied");
    });
});

describe("operator UI support", () => {
    it("records the reason chosen for a deduction", async () => {
        const product = await seedProduct();
        const warehouse = await seedWarehouse();
        const row = await seedRow(product, warehouse, 5);

        await new InventoryActions().deduct({
            ...staff(["inventories[write:quantityOnHand]"]), _id: row._id.toString(), quantity: 2, reason: "damage",
        });

        expect((await InventoryMovement.findOne({inventory: row._id}))!.reason).toBe("damage");
        expect(await stockOf(product, warehouse)).toEqual([3, 0]);
    });

    it("labels order lines for the item pickers", () => {
        const lineId = new ObjectId();
        const options = productOrderLinesToSelect({
            items: [{_id: lineId, quantity: 2, snapshot: {title: "Tee", variantLabel: "Red / XL"}}],
        } as any);
        expect(options).toEqual([{value: lineId.toString(), label: "Tee (Red / XL) × 2"}]);
    });

    it("copies the sold product onto a fulfillment or return line", () => {
        const lineId = new ObjectId();
        const productId = new ObjectId();
        const variantId = new ObjectId();
        const [line] = attachOrderLineProductCopy(
            [{orderItemId: lineId.toString(), quantity: 2}],
            {
                items: [{
                    _id: lineId,
                    product: {_id: productId, title: "Tee", slug: "tee", sku: "TEE-1", status: "active", type: "physical"},
                    variant: {_id: variantId, sku: "TEE-1-RED", price: 10, status: "active"},
                    snapshot: {title: "Tee", sku: "TEE-1", variantLabel: "Red / XL", productType: "physical"},
                }],
            } as any,
        );
        expect(line.product).toMatchObject({_id: productId.toString(), title: "Tee", sku: "TEE-1"});
        expect(line.variant).toMatchObject({_id: variantId.toString(), sku: "TEE-1-RED"});
        expect(line.snapshot).toMatchObject({title: "Tee", sku: "TEE-1", variantLabel: "Red / XL", productType: "physical"});

        const [missing] = attachOrderLineProductCopy(
            [{orderItemId: new ObjectId().toString(), quantity: 1}],
            {items: []} as any,
        );
        expect(missing.product).toBeUndefined();
        expect(missing.snapshot).toBeUndefined();
    });
});
