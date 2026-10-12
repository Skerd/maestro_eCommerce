import {Schema} from "mongoose";

export function applyProductAttributeIndexes(ProductAttributeSchema: Schema): void {
    ProductAttributeSchema.index({company: 1, name: 1}, {unique: true, partialFilterExpression: {deletedAt: null}});
    ProductAttributeSchema.index({company: 1, position: 1});
}
