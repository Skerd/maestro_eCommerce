import type {Schema} from "mongoose";

export function applyProductReviewIndexes(schema: Schema): void {
    // One active review per product per order (soft-deleted rows do not block a new review)
    schema.index(
        {order: 1, product: 1},
        {unique: true, partialFilterExpression: {deletedAt: null}},
    );
    // Rating aggregation + product review listings
    schema.index({product: 1, createdAt: -1});
    schema.index({company: 1, createdAt: -1});
    schema.index({reviewer: 1});
}
