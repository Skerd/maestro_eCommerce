import type {IPricingRule} from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function pricingRulesToSelect(rules: IPricingRule[]): ApiSelectDatum[] {
    return rules.map((c) => ({
        value: c._id.toString(),
        label: c.name
    }));
}
