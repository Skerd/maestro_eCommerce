import {Schema} from "mongoose";

export function applyCustomerAddressIndexes(CustomerAddressSchema: Schema): void {
    CustomerAddressSchema.index({customer: 1, company: 1});
    CustomerAddressSchema.index({customer: 1, isDefault: 1});
}
