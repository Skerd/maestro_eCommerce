import {Schema} from "mongoose";

export function applyDiscountIndexes(DiscountSchema: Schema): void {
    DiscountSchema.index({company: 1, code: 1}, {unique: true, partialFilterExpression: {code: {$type: "string"}, deletedAt: null}});
    DiscountSchema.index({company: 1, isActive: 1, startsAt: 1, endsAt: 1});
    DiscountSchema.index({company: 1, type: 1});
}
