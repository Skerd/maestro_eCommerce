import {Schema} from "mongoose";

export function applyCustomerGroupMemberIndexes(schema: Schema): void {
    schema.index({company: 1, customerGroup: 1, user: 1}, {unique: true, partialFilterExpression: {deletedAt: null}});
    schema.index({company: 1, user: 1});
    schema.index({company: 1, customerGroup: 1});
}
