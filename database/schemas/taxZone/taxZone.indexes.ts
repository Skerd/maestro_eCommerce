import {Schema} from "mongoose";

export function applyTaxZoneIndexes(TaxZoneSchema: Schema): void {
    TaxZoneSchema.index({company: 1, country: 1});
    TaxZoneSchema.index({company: 1, isActive: 1, priority: -1});
}
