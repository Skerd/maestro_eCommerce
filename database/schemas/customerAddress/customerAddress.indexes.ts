import {Schema} from "mongoose";

export function applyCustomerAddressIndexes(CustomerAddressSchema: Schema): void {
    CustomerAddressSchema.index({user: 1, company: 1});
    CustomerAddressSchema.index({user: 1, isDefault: 1});
}
