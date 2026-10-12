import {ObjectId} from "mongodb";
import PricingRule, {IPricingRule} from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import Product from "@eCommerceModule/database/schemas/product/product";
import type {
    CartLineForPricing,
    PricingCalculationResult,
    PricingRuleLineAdjustment,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.calculation.type";

export type {CartLineForPricing};

export type CartForPricing = {
    subtotal: number;
    items: CartLineForPricing[];
    customerGroupIds?: ObjectId[];
};

/** Normalize ObjectId | populated doc | string to a comparable id string. */
function idKey(value: unknown): string {
    if (value == null) return "";
    if (value instanceof ObjectId) return value.toString();
    if (typeof value === "object" && "_id" in value) {
        return String((value as {_id: unknown})._id);
    }
    return String(value);
}

function toObjectId(value: unknown): ObjectId {
    if (value instanceof ObjectId) return value;
    if (typeof value === "string") return new ObjectId(value);
    if (value && typeof value === "object" && "_id" in value) {
        return toObjectId((value as {_id: unknown})._id);
    }
    return new ObjectId(String(value));
}

function isRuleActive(rule: IPricingRule, now: Date): boolean {
    if (!rule.isActive) return false;
    if (rule.startsAt && rule.startsAt > now) return false;
    return !(rule.endsAt && rule.endsAt < now);
}

function ruleMatchesCustomerGroups(rule: IPricingRule, customerGroupIds: ObjectId[] = []): boolean {
    const ruleGroups = rule.customerGroups ?? [];
    if (ruleGroups.length === 0) return true;
    const cartKeys = new Set(customerGroupIds.map((cg) => idKey(cg)));
    return ruleGroups.some((g) => cartKeys.has(idKey(g)));
}

function lineMatchesRule(rule: IPricingRule, line: CartLineForPricing): boolean {
    if (rule.appliesTo === "all") return true;
    // Cart-level customer-group filter already applied; these rules hit every line.
    if (rule.appliesTo === "customer_group") return true;

    const targets = rule.targetIds ?? [];
    if (targets.length === 0) return false;

    if (rule.appliesTo === "product") {
        return targets.some((t) => idKey(t) === line.productId);
    }
    if (rule.appliesTo === "category") {
        if (!line.categoryId) return false;
        return targets.some((t) => idKey(t) === line.categoryId);
    }
    if (rule.appliesTo === "collection" && line.collectionIds?.length) {
        return targets.some((t) => line.collectionIds!.some((c) => c === idKey(t)));
    }
    return false;
}

function applyRuleToUnitPrice(rule: IPricingRule, unitPrice: number): number {
    switch (rule.type) {
        case "percentage_discount":
            return Math.max(0, unitPrice - (unitPrice * rule.value) / 100);
        case "fixed_discount":
            return Math.max(0, unitPrice - rule.value);
        case "fixed_price":
            return Math.max(0, rule.value);
        case "surcharge":
            return unitPrice + rule.value;
        default:
            return unitPrice;
    }
}

export async function calculatePricing(
    cart: CartForPricing,
    companyId: ObjectId,
): Promise<PricingCalculationResult> {
    const now = new Date();
    const rules = await PricingRule.find({company: companyId, isActive: true}).noDeleted()
        .sort({priority: -1, createdAt: -1})
        .lean();

    const activeRules = rules.filter((r) => isRuleActive(r as IPricingRule, now) && ruleMatchesCustomerGroups(r as IPricingRule, cart.customerGroupIds));

    const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
    const lineAdjustments: PricingRuleLineAdjustment[] = [];
    const appliedRuleIds = new Set<string>();
    const adjustedLines: CartLineForPricing[] = [];

    let adjustedSubtotal = 0;

    for (const line of cart.items) {
        let unitPrice = line.unitPrice;

        for (const rule of activeRules) {
            const r = rule as IPricingRule;
            if (r.minimumOrderAmount != null && cart.subtotal < r.minimumOrderAmount) continue;
            if (r.minimumQuantity != null && totalQty < r.minimumQuantity) continue;
            if (!lineMatchesRule(r, line)) continue;

            const newPrice = applyRuleToUnitPrice(r, unitPrice);
            if (newPrice !== unitPrice) {
                lineAdjustments.push({
                    ruleId: r._id.toString(),
                    ruleName: r.name,
                    ruleType: r.type,
                    originalUnitPrice: unitPrice,
                    adjustedUnitPrice: newPrice,
                    lineTotalAdjustment: (newPrice - unitPrice) * line.quantity,
                });
                appliedRuleIds.add(r._id.toString());
                unitPrice = newPrice;
            }
            break;
        }

        adjustedLines.push({...line, unitPrice});
        adjustedSubtotal += unitPrice * line.quantity;
    }

    return {
        adjustedSubtotal,
        subtotalAdjustment: adjustedSubtotal - cart.subtotal,
        lineAdjustments,
        appliedRuleIds: [...appliedRuleIds],
        adjustedLines,
    };
}

export async function enrichCartLinesWithProductMeta(
    items: {product: ObjectId; variant?: ObjectId; quantity: number; unitPrice: number}[],
    companyId: ObjectId,
): Promise<CartLineForPricing[]> {
    const productIds = [...new Set(items.map((i) => i.product.toString()))].map((id) => new ObjectId(id));
    const products = await Product.find({_id: {$in: productIds}, company: companyId})
        .select("categories collections")
        .lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    return items.map((item) => {
        const p = productMap.get(item.product.toString());
        const categories = p?.categories ?? [];
        const collections = p?.collections ?? [];
        return {
            productId: item.product.toString(),
            variantId: item.variant?.toString(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            categoryId: categories[0] ? idKey(categories[0]) : undefined,
            collectionIds: collections.map((c) => idKey(c)),
        };
    });
}

export async function getCustomerGroupIdsForUser(userId: ObjectId, companyId: ObjectId): Promise<ObjectId[]> {
    const members = await CustomerGroupMember.find({user: userId, company: companyId}).noDeleted().select("customerGroup").lean();
    return members.map((m) => toObjectId(m.customerGroup));
}
