import type {Schema} from "mongoose";

export function applyProductReviewIndexes(schema: Schema): void {
    // One review per product per order
    schema.index({order: 1, product: 1}, {unique: true});
    // Rating aggregation + product review listings
    schema.index({product: 1, createdAt: -1});
    schema.index({company: 1, createdAt: -1});
    schema.index({reviewer: 1});
}
