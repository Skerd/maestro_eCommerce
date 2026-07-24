import {Schema} from "mongoose";

export function applyPosSessionIndexes(PosSessionSchema: Schema): void {
    PosSessionSchema.index({company: 1, name: 1}, {unique: true});
    PosSessionSchema.index({company: 1, state: 1, createdAt: -1});
    PosSessionSchema.index({company: 1, config: 1, state: 1});
    PosSessionSchema.index({company: 1, openedAt: -1});
}
