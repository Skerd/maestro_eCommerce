import type {IPricingRule} from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import type {PricingRule, PricingRuleRef} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.dto";
import {dateToISOString, objectIdToString} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {loadNamedRefs} from "@eCommerceModule/utilities/mappers/helpers/namedRefs";

function ids(values: unknown[] | undefined): string[] | undefined {
    if (!values) return undefined;
    return values.map((v: any) => objectIdToString(v?._id ?? v));
}

function withTitle(refs: {_id: string; name: string}[]): PricingRuleRef[] {
    return refs.map((r) => ({_id: r._id, name: r.name, title: r.name}));
}

/** Polymorphic `targetIds` — resolve names by `appliesTo` (no single mongoose ref). */
async function loadTargets(rule: IPricingRule): Promise<PricingRuleRef[]> {
    const {appliesTo, targetIds} = rule;
    if (!targetIds?.length) return [];
    if (appliesTo === "product") return withTitle(await loadNamedRefs(Product as any, targetIds as any, "title"));
    if (appliesTo === "collection") return loadNamedRefs(ProductCollection as any, targetIds as any, "name");
    if (appliesTo === "category") return loadNamedRefs(ProductCategory as any, targetIds as any, "name");
    return [];
}

function buildPricingRuleDTO(
    rule: IPricingRule,
    targets: PricingRuleRef[],
    customerGroupRefs: PricingRuleRef[],
): PricingRule {
    const {appliesTo} = rule;
    return {
        _id: rule._id.toString(),
        name: rule.name,
        type: rule.type,
        value: rule.value,
        appliesTo,
        targetIds: ids(rule.targetIds as any),
        targets,
        productTargets: appliesTo === "product" ? targets : [],
        collectionTargets: appliesTo === "collection" ? targets : [],
        categoryTargets: appliesTo === "category" ? targets : [],
        customerGroups: ids(rule.customerGroups as any),
        customerGroupRefs,
        minimumOrderAmount: rule.minimumOrderAmount,
        minimumQuantity: rule.minimumQuantity,
        priority: rule.priority,
        isActive: rule.isActive,
        startsAt: dateToISOString(rule.startsAt) || undefined,
        endsAt: dateToISOString(rule.endsAt) || undefined,
        ...mapSoftDeleteToDTO(rule),
        ...mapOwnershipToDTO(rule),
        ...mapLifeCycleToDTO(rule),
    };
}

/** Sync create-response path — chip labels come from `pricingRuleToDTOWithLabels` (enrich). */
export function pricingRuleToDTO(rule: IPricingRule): PricingRule {
    return buildPricingRuleDTO(rule, [], []);
}

export async function pricingRuleToDTOWithLabels(rule: IPricingRule): Promise<PricingRule> {
    const [targets, customerGroupRefs] = await Promise.all([
        loadTargets(rule),
        loadNamedRefs(CustomerGroup as any, rule.customerGroups as any, "name"),
    ]);
    return buildPricingRuleDTO(rule, targets, customerGroupRefs);
}

export async function pricingRulesToDTOWithLabels(rules: IPricingRule[]): Promise<PricingRule[]> {
    return Promise.all(rules.map(pricingRuleToDTOWithLabels));
}

export function pricingRulesToDTO(rules: IPricingRule[]): PricingRule[] {
    return rules.map(pricingRuleToDTO);
}
