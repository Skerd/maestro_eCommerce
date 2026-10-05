import {Schema} from "mongoose";

export function applyPosConfigIndexes(PosConfigSchema: Schema): void {
    PosConfigSchema.index({company: 1, name: 1});
    PosConfigSchema.index({company: 1, isActive: 1});
    PosConfigSchema.index({company: 1, warehouses: 1});
    PosConfigSchema.index({company: 1, fiscalConfig: 1});
    PosConfigSchema.index({"managerPins.pinReset.code": 1}, {sparse: true});
}
