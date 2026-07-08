import { Schema } from "mongoose";

export function applyOrderDeliveryIndexes(schema: Schema) {
    schema.index({ order: 1, createdAt: -1 });
    schema.index({ company: 1, order: 1 });
}
