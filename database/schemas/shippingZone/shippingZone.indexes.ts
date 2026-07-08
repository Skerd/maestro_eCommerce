import {Schema} from "mongoose";

export function applyShippingZoneIndexes(ShippingZoneSchema: Schema): void {
    ShippingZoneSchema.index({company: 1, isActive: 1});
    ShippingZoneSchema.index({company: 1, countries: 1});
}
