import {Schema} from "mongoose";

export function applyShopSettingsIndexes(schema: Schema): void {
    // One active settings document per shop.
    schema.index({company: 1}, {unique: true, partialFilterExpression: {deletedAt: null}});
}
