import {Schema} from "mongoose";

export function applyPricingRuleIndexes(PricingRuleSchema: Schema): void {
    PricingRuleSchema.index({company: 1, isActive: 1, priority: -1});
    PricingRuleSchema.index({company: 1, appliesTo: 1});
    PricingRuleSchema.index({company: 1, startsAt: 1, endsAt: 1});
}
