import { Schema } from "mongoose";

export function applyOrderIndexes(OrderSchema: Schema): void {
    OrderSchema.index({ company: 1, createdAt: -1 });
    OrderSchema.index({ company: 1, status: 1 });
    OrderSchema.index({ customer: 1, status: 1 });
    OrderSchema.index({ provider: 1, status: 1 });
    OrderSchema.index({ listing: 1, createdAt: -1 });
    OrderSchema.index({ _id: 1, company: 1 });
}
