import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Inventory, {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {ObjectId} from "mongodb";

type StockKey = {product: ObjectId; variant?: ObjectId; warehouse: ObjectId; company: ObjectId};

export class InventoryService extends BaseCrudService<IInventory, typeof Inventory> {
    constructor() {
        super(Inventory, "Inventory");
    }

    /** Atomically reserve stock. Returns null if insufficient stock (out-of-stock). */
    async reserveStock(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        quantity: number,
        opts: CrudOptions,
    ): Promise<IInventory | null> {
        const filter: Record<string, unknown> = {
            product: productId,
            warehouse: warehouseId,
            variant: variantId ?? null,
            deletedAt: null,
        };

        return Inventory.findOneAndUpdate(
            {
                ...filter,
                $expr: {$gte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, quantity]},
            },
            {$inc: {quantityReserved: quantity}},
            {new: true, session: opts.session},
        );
    }

    /**
     * Release previously reserved stock (e.g. cart expired, checkout failed).
     * Never takes `quantityReserved` below zero. Returns false when no live row matched.
     */
    async releaseReservation(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        quantity: number,
        opts: CrudOptions,
    ): Promise<boolean> {
        const filter: Record<string, unknown> = {product: productId, warehouse: warehouseId, variant: variantId ?? null, deletedAt: null};

        const released = await Inventory.findOneAndUpdate(
            {...filter, quantityReserved: {$gte: quantity}},
            {$inc: {quantityReserved: -quantity}},
            {session: opts.session},
        );
        if (released) return true;

        const floored = await Inventory.findOneAndUpdate(
            filter,
            {$set: {quantityReserved: 0}},
            {session: opts.session},
        );
        return floored != null;
    }

    /**
     * Convert reservation to sale: decrement both onHand and reserved (reserved never below
     * zero). Returns the updated row, or null when no live row matched.
     */
    async confirmSale(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        quantity: number,
        opts: CrudOptions,
    ): Promise<IInventory | null> {
        const filter: Record<string, unknown> = {product: productId, warehouse: warehouseId, variant: variantId ?? null, deletedAt: null};

        const sold = await Inventory.findOneAndUpdate(
            {...filter, quantityReserved: {$gte: quantity}},
            {$inc: {quantityOnHand: -quantity, quantityReserved: -quantity}},
            {new: true, session: opts.session},
        );
        if (sold) return sold;

        return Inventory.findOneAndUpdate(
            filter,
            {$inc: {quantityOnHand: -quantity}, $set: {quantityReserved: 0}},
            {new: true, session: opts.session},
        );
    }

    /**
     * Manual adjustment (restock, damage write-off, return) of an existing row.
     * Matches the exact variant (null = base product row) and never upserts —
     * returns null when no such inventory row exists.
     */
    async adjust(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        delta: number,
        opts: CrudOptions,
    ): Promise<IInventory | null> {
        return Inventory.findOneAndUpdate(
            {product: productId, warehouse: warehouseId, variant: variantId ?? null, deletedAt: null},
            {$inc: {quantityOnHand: delta}},
            {new: true, session: opts.session},
        );
    }

    /**
     * Undoes a sale whose goods came back before reaching the buyer (a shipment
     * marked failed): the units return on hand and are held again for the order.
     */
    async reverseSale(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        quantity: number,
        opts: CrudOptions,
    ): Promise<IInventory | null> {
        return Inventory.findOneAndUpdate(
            {product: productId, warehouse: warehouseId, variant: variantId ?? null, deletedAt: null},
            {$inc: {quantityOnHand: quantity, quantityReserved: quantity}},
            {new: true, session: opts.session},
        );
    }

    /**
     * Takes units straight from stock, without a hold (till sale, transfer out).
     * Only free stock (on hand minus reserved) can go, unless overselling is
     * allowed: then on-hand may go below zero, and the row is created when the
     * warehouse never stocked the item. Returns null when the free stock is short.
     */
    async takeStock(key: StockKey, quantity: number, allowOversell: boolean, opts: CrudOptions): Promise<IInventory | null> {
        const filter = {product: key.product, variant: key.variant ?? null, warehouse: key.warehouse, company: key.company, deletedAt: null};
        if (!allowOversell) {
            return Inventory.findOneAndUpdate(
                {...filter, $expr: {$gte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, quantity]}},
                {$inc: {quantityOnHand: -quantity}},
                {new: true, session: opts.session},
            );
        }
        const row = await Inventory.findOneAndUpdate(filter, {$inc: {quantityOnHand: -quantity}}, {new: true, upsert: true, session: opts.session});
        await this.linkToProduct(row, opts);
        return row;
    }

    /**
     * Puts units into stock (till refund, transfer in, count found more),
     * creating the row when the warehouse never held the item.
     */
    async addStock(key: StockKey, quantity: number, opts: CrudOptions): Promise<IInventory> {
        const row = await Inventory.findOneAndUpdate(
            {product: key.product, variant: key.variant ?? null, warehouse: key.warehouse, company: key.company, deletedAt: null},
            {$inc: {quantityOnHand: quantity}},
            {new: true, upsert: true, session: opts.session},
        );
        await this.linkToProduct(row, opts);
        return row;
    }

    /** Rows created by upsert join the product's inventory list, like panel-created ones. */
    private async linkToProduct(row: IInventory, opts: CrudOptions): Promise<void> {
        await Product.updateOne(
            {_id: nestedEntityToRef(row.product), company: nestedEntityToRef(row.company)},
            {$addToSet: {inventories: row._id}},
            {session: opts.session},
        );
    }
}

export const inventoryService = new InventoryService();

/**
 * A stock key (stock row, transfer line, count line) may only point at this
 * company's live product and warehouse, and at a live variant of that product.
 */
export async function assertOwnStockReferences(
    key: {product: unknown; variant?: unknown; warehouse: unknown},
    params: Pick<TransactionRequiredParams, "company" | "session" | "languageCode">,
): Promise<void> {
    const {company, session, languageCode} = params;
    const productId = nestedEntityToRef(key.product);
    const variantId = nestedEntityToRef(key.variant);
    const [product, warehouse, variant] = await Promise.all([
        Product.exists({_id: productId, company: company._id, deletedAt: null}).session(session ?? null),
        Warehouse.exists({_id: nestedEntityToRef(key.warehouse), company: company._id, deletedAt: null}).session(session ?? null),
        variantId
            ? ProductVariant.exists({_id: variantId, product: productId, company: company._id, deletedAt: null}).session(session ?? null)
            : true,
    ]);
    if (!product || !warehouse || !variant) {
        throw apiValidationException("inventory_reference_invalid", "", null, languageCode);
    }
}
