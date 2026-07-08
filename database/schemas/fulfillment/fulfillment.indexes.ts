import {Schema} from "mongoose";

export function applyFulfillmentIndexes(FulfillmentSchema: Schema): void {
    FulfillmentSchema.index({order: 1, company: 1});
    FulfillmentSchema.index({company: 1, status: 1});
    FulfillmentSchema.index({trackingNumber: 1}, {sparse: true});
}
