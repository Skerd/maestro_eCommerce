import { Schema } from "mongoose";

/** One platform tree (D195): slugs and taxonomy ids are unique across the platform. */
export function applyCategoryIndexes(CategorySchema: Schema) {
    CategorySchema.index({ parent: 1, order: 1 });
    CategorySchema.index({ slug: 1 }, { unique: true });
    CategorySchema.index({ shopifyId: 1 }, { unique: true, partialFilterExpression: { shopifyId: { $type: "string" } } });
}
