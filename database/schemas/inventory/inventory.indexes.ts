import {Schema} from "mongoose";

export function applyInventoryIndexes(InventorySchema: Schema): void {
    // One active stock row per key. MongoDB rejects `sparse` together with a partial filter,
    // so the partial filter alone scopes uniqueness to non-deleted rows.
    InventorySchema.index(
        {product: 1, variant: 1, warehouse: 1, company: 1},
        {unique: true, partialFilterExpression: {deletedAt: null}},
    );
    InventorySchema.index({company: 1, product: 1});
    InventorySchema.index({company: 1, warehouse: 1});
    InventorySchema.index({company: 1, quantityOnHand: 1});
    InventorySchema.index({company: 1, lowStockAlertSent: 1, reorderPoint: 1});
}
