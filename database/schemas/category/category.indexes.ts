import { Schema } from "mongoose";

export function applyCategoryIndexes(CategorySchema: Schema) {
    CategorySchema.index({ company: 1, parent: 1 });
    CategorySchema.index({ company: 1, slug: 1 }, { unique: true });
}
