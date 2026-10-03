import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Inventory, {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {ObjectId} from "mongodb";

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

    /** Release previously reserved stock (e.g. cart expired, checkout failed). */
    async releaseReservation(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        quantity: number,
        opts: CrudOptions,
    ): Promise<void> {
        const filter: Record<string, unknown> = {product: productId, warehouse: warehouseId, variant: variantId ?? null};

        await Inventory.findOneAndUpdate(
            filter,
            {$inc: {quantityReserved: -quantity}},
            {session: opts.session},
        );
    }

    /** Convert reservation to sale: decrement both onHand and reserved. */
    async confirmSale(
        productId: ObjectId,
        variantId: ObjectId | undefined,
        warehouseId: ObjectId,
        quantity: number,
        opts: CrudOptions,
    ): Promise<void> {
        const filter: Record<string, unknown> = {product: productId, warehouse: warehouseId, variant: variantId ?? null};

        await Inventory.findOneAndUpdate(
            filter,
            {$inc: {quantityOnHand: -quantity, quantityReserved: -quantity}},
            {session: opts.session},
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
            {product: productId, warehouse: warehouseId, variant: variantId ?? null},
            {$inc: {quantityOnHand: delta}},
            {new: true, session: opts.session},
        );
    }
}

export const inventoryService = new InventoryService();
