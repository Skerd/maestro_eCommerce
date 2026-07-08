import { Schema } from "mongoose";

export function applyEscrowTransactionIndexes(EscrowTransactionSchema: Schema): void {
    EscrowTransactionSchema.index({ order: 1, createdAt: 1 });
    EscrowTransactionSchema.index({ company: 1, type: 1, status: 1 });
}
