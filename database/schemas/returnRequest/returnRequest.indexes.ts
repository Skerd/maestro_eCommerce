import {Schema} from "mongoose";

export function applyReturnRequestIndexes(ReturnRequestSchema: Schema): void {
    ReturnRequestSchema.index({order: 1, company: 1});
    ReturnRequestSchema.index({company: 1, status: 1, createdAt: -1});
    ReturnRequestSchema.index({company: 1, type: 1});
}
