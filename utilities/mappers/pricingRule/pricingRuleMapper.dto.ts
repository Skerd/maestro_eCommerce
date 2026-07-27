import type {IPricingRule} from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import type {PricingRule} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.dto";
import {
    dateToISOString,
    mapPopulatedRef,
    objectIdToString,
} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {loadNamedRefs, type NamedRef} from "@eCommerceModule/utilities/mappers/helpers/namedRefs";

export async function resolvePricingRuleRefs(rule: IPricingRule): Promise<{
    targets: NamedRef[];
    customerGroupRefs: NamedRef[];
}> {
    const [customerGroupRefs, targets] = await Promise.all([
        loadNamedRefs(CustomerGroup as any, rule.customerGroups as any, "name"),
        (async () => {
            const ids = rule.targetIds as any;
            if (!ids?.length) return [] as NamedRef[];
            if (rule.appliesTo === "product") return loadNamedRefs(Product as any, ids, "title");
            if (rule.appliesTo === "collection") return loadNamedRefs(ProductCollection as any, ids, "name");
            if (rule.appliesTo === "category") return loadNamedRefs(ProductCategory as any, ids, "name");
            return [];
        })(),
    ]);

    return {targets, customerGroupRefs};
}

export function pricingRuleToDTO(
    rule: IPricingRule,
    refs?: {
        targets?: NamedRef[];
        customerGroupRefs?: NamedRef[];
    },
): PricingRule {
    const targets = refs?.targets ?? [];
    const appliesTo = rule.appliesTo;

    return {
        _id: rule._id.toString(),
        name: rule.name,
        type: rule.type,
        value: rule.value,
        appliesTo,
        targetIds: rule.targetIds?.map((id: any) => objectIdToString(id?._id ?? id)),
        targets,
        productTargets: appliesTo === "product" ? targets.map((r) => ({_id: r._id, name: r.name, title: r.name})) : [],
        collectionTargets: appliesTo === "collection" ? targets : [],
        categoryTargets: appliesTo === "category" ? targets : [],
        customerGroups: rule.customerGroups?.map((id: any) => objectIdToString(id?._id ?? id)),
        customerGroupRefs: refs?.customerGroupRefs ?? [],
        minimumOrderAmount: rule.minimumOrderAmount,
        minimumQuantity: rule.minimumQuantity,
        priority: rule.priority,
        isActive: rule.isActive,
        startsAt: dateToISOString(rule.startsAt) || undefined,
        endsAt: dateToISOString(rule.endsAt) || undefined,
        company: mapPopulatedRef(rule.company as any),
        ...mapSoftDeleteToDTO(rule),
        ...mapOwnershipToDTO(rule),
        ...mapLifeCycleToDTO(rule),
    };
}

export async function pricingRuleToDTOWithLabels(rule: IPricingRule): Promise<PricingRule> {
    return pricingRuleToDTO(rule, await resolvePricingRuleRefs(rule));
}

export async function pricingRulesToDTOWithLabels(rules: IPricingRule[]): Promise<PricingRule[]> {
    return Promise.all(rules.map(pricingRuleToDTOWithLabels));
}

export function pricingRulesToDTO(rules: IPricingRule[]): PricingRule[] {
    return rules.map((r) => pricingRuleToDTO(r));
}
