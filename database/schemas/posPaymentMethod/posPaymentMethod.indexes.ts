import {Schema} from "mongoose";

export function applyPosPaymentMethodIndexes(PosPaymentMethodSchema: Schema): void {
    PosPaymentMethodSchema.index({company: 1, name: 1});
    PosPaymentMethodSchema.index({company: 1, type: 1});
    PosPaymentMethodSchema.index({company: 1, isActive: 1, sequence: 1});
}
