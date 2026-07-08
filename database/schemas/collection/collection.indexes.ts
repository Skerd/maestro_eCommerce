import {Schema} from "mongoose";

export function applyCollectionIndexes(CollectionSchema: Schema): void {
    CollectionSchema.index({company: 1, slug: 1}, {unique: true});
    CollectionSchema.index({company: 1, type: 1});
    CollectionSchema.index({company: 1, isVisible: 1, position: 1});
    CollectionSchema.index({company: 1, products: 1});
}
