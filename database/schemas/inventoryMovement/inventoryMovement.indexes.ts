import {Schema} from "mongoose";

export function applyInventoryMovementIndexes(InventoryMovementSchema: Schema): void {
    InventoryMovementSchema.index({company: 1, product: 1, createdAt: -1});
    InventoryMovementSchema.index({company: 1, warehouse: 1, createdAt: -1});
    InventoryMovementSchema.index({company: 1, reason: 1});
    InventoryMovementSchema.index({referenceType: 1, referenceId: 1});
}
