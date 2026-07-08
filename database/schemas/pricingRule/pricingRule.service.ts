import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PricingRule, {IPricingRule} from "@eCommerceModule/database/schemas/pricingRule/pricingRule";

export class PricingRuleService extends BaseCrudService<IPricingRule, typeof PricingRule> {
    constructor() {
        super(PricingRule, "PricingRule");
    }
}

export const pricingRuleService = new PricingRuleService();
