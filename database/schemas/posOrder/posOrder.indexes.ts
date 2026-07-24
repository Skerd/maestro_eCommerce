import {Schema} from "mongoose";

export function applyPosOrderIndexes(PosOrderSchema: Schema): void {
    PosOrderSchema.index({company: 1, name: 1}, {unique: true});
    PosOrderSchema.index({company: 1, state: 1, createdAt: -1});
    PosOrderSchema.index({session: 1, state: 1});
    PosOrderSchema.index({company: 1, session: 1, createdAt: -1});
    PosOrderSchema.index({company: 1, cashier: 1, createdAt: -1});
    PosOrderSchema.index({refundOf: 1}, {sparse: true});
    PosOrderSchema.index(
        {company: 1, clientRequestId: 1},
        {unique: true, sparse: true, partialFilterExpression: {clientRequestId: {$type: "string"}}},
    );
}
