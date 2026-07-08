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

function isRuleActive(rule: IPricingRule, now: Date): boolean {
    if (!rule.isActive) return false;
    if (rule.startsAt && rule.startsAt > now) return false;
    if (rule.endsAt && rule.endsAt < now) return false;
    return true;
}

function ruleMatchesCustomerGroups(rule: IPricingRule, customerGroupIds: ObjectId[] = []): boolean {
    const ruleGroups = (rule.customerGroups ?? []) as ObjectId[];
    if (ruleGroups.length === 0) return true;
    return ruleGroups.some((g) => customerGroupIds.some((cg) => cg.toString() === g.toString()));
}

function lineMatchesRule(rule: IPricingRule, line: CartLineForPricing): boolean {
    if (rule.appliesTo === "all") return true;
    if (rule.appliesTo === "customer_group") return ruleMatchesCustomerGroups(rule, []);
    const targets = (rule.targetIds ?? []) as ObjectId[];
    if (targets.length === 0) return rule.appliesTo === "all";

    if (rule.appliesTo === "product") {
        return targets.some((t) => t.toString() === line.productId.toString());
    }
    if (rule.appliesTo === "category" && line.categoryId) {
        return targets.some((t) => t.toString() === line.categoryId!.toString());
    }
    if (rule.appliesTo === "category" && !line.categoryId) {
        return false;
    }
    if (rule.appliesTo === "collection" && line.collectionIds?.length) {
        return targets.some((t) => line.collectionIds!.some((c) => c.toString() === t.toString()));
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
    const rules = await PricingRule.find({company: companyId, isActive: true})
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
        const categories = (p?.categories as ObjectId[] | undefined) ?? [];
        const collections = (p?.collections as ObjectId[] | undefined) ?? [];
        return {
            productId: item.product.toString(),
            variantId: item.variant?.toString(),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            categoryId: categories[0]?.toString(),
            collectionIds: collections.map((c) => c.toString()),
        };
    });
}

export async function getCustomerGroupIdsForUser(userId: ObjectId, companyId: ObjectId): Promise<ObjectId[]> {
    const members = await CustomerGroupMember.find({user: userId, company: companyId, deletedAt: null}).select("customerGroup").lean();
    return members.map((m) => m.customerGroup as ObjectId);
}
