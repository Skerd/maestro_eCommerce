import type {Schema} from "mongoose";

export function applyFiscalConfigIndexes(schema: Schema): void {
    schema.index({company: 1, deletedAt: 1, name: 1});
    schema.index({company: 1, deletedAt: 1, isActive: 1});
}
