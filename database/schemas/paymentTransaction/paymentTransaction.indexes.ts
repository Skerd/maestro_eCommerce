import {Schema} from "mongoose";

export function applyPaymentTransactionIndexes(PaymentTransactionSchema: Schema): void {
    PaymentTransactionSchema.index({order: 1, company: 1});
    PaymentTransactionSchema.index({gatewayTransactionId: 1}, {sparse: true});
    PaymentTransactionSchema.index({company: 1, status: 1, createdAt: -1});
    PaymentTransactionSchema.index({company: 1, gateway: 1});
}
