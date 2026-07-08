import {Schema} from "mongoose";

export function applyInventoryIndexes(InventorySchema: Schema): void {
    // Unique per product+variant+warehouse combination
    InventorySchema.index({product: 1, variant: 1, warehouse: 1, company: 1}, {unique: true, sparse: true});
    InventorySchema.index({company: 1, product: 1});
    InventorySchema.index({company: 1, warehouse: 1});
    InventorySchema.index({company: 1, quantityOnHand: 1});
    // For low-stock alert queries
    InventorySchema.index({company: 1, lowStockAlertSent: 1, reorderPoint: 1});
}
