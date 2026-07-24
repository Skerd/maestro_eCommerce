import {Schema} from "mongoose";

export function applyPosConfigIndexes(PosConfigSchema: Schema): void {
    PosConfigSchema.index({company: 1, name: 1});
    PosConfigSchema.index({company: 1, isActive: 1});
    PosConfigSchema.index({company: 1, warehouse: 1});
}
