import {Schema} from "mongoose";

export function applyWarehouseIndexes(WarehouseSchema: Schema): void {
    WarehouseSchema.index({company: 1, code: 1}, {unique: true, partialFilterExpression: {deletedAt: null}});
    WarehouseSchema.index({company: 1, isDefault: 1});
    WarehouseSchema.index({company: 1, isActive: 1});
}
