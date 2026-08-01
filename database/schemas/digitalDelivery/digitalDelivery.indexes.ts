import {Schema} from "mongoose";

export function applyDigitalDeliveryIndexes(DigitalDeliverySchema: Schema): void {
    DigitalDeliverySchema.index({token: 1}, {unique: true});
    DigitalDeliverySchema.index({order: 1, product: 1}, {unique: true});
    DigitalDeliverySchema.index({customer: 1, company: 1});
}
