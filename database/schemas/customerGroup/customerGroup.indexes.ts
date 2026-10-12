import {Schema} from "mongoose";

export function applyCustomerGroupIndexes(CustomerGroupSchema: Schema): void {
    CustomerGroupSchema.index({company: 1, name: 1}, {unique: true, partialFilterExpression: {deletedAt: null}});
    CustomerGroupSchema.index({company: 1, isDefault: 1});
}
