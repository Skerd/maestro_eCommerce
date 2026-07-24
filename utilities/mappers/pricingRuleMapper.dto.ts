import type {IPricingRule} from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import type {PricingRule} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function pricingRuleToDTO(rule: IPricingRule): PricingRule {
    return {
        _id: rule._id.toString(),
        name: rule.name,
        type: rule.type,
        value: rule.value,
        appliesTo: rule.appliesTo,
        targetIds: rule.targetIds?.map((id: any) => id.toString()),
        customerGroups: rule.customerGroups?.map((id: any) => id.toString()),
        minimumOrderAmount: rule.minimumOrderAmount,
        minimumQuantity: rule.minimumQuantity,
        priority: rule.priority,
        isActive: rule.isActive,
        startsAt: rule.startsAt?.toISOString(),
        endsAt: rule.endsAt?.toISOString(),
        company: mapCompanyLabel(rule.company),
        ...mapSoftDeleteToDTO(rule),
        ...mapOwnershipToDTO(rule),
    };
}

export function pricingRulesToDTO(rules: IPricingRule[]): PricingRule[] {
    return rules.map(pricingRuleToDTO);
}

export function pricingRuleToSelect(rule: IPricingRule): ApiSelectDatum {
    return {value: rule._id.toString(), label: rule.name};
}

export function pricingRulesToSelect(rules: IPricingRule[]): ApiSelectDatum[] {
    return rules.map(pricingRuleToSelect);
}
