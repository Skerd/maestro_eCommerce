import {ObjectId} from "mongodb";
import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {roundMoney} from "@coreModule/utilities/helpers/money";

export type CartForValidation = {
    subtotal: number;
    items: {
        productId: ObjectId;
        variantId?: ObjectId;
        quantity: number;
        unitPrice: number;
        categoryIds?: string[];
        collectionIds?: string[];
        /** Gift-card lines are store credit: never discountable, never count toward minimums. */
        isGiftCard?: boolean;
    }[];
    customerId?: ObjectId;
    appliedDiscountIds?: ObjectId[];
};

export type DiscountValidationResult =
    | {valid: true; discountAmount: number; discount: IDiscount}
    | {valid: false; reason: string};

function idKey(value: unknown): string {
    if (value == null) return "";
    if (value instanceof ObjectId) return value.toString();
    if (typeof value === "object" && "_id" in value) {
        return String((value as {_id: unknown})._id);
    }
    return String(value);
}

type ValidationLine = CartForValidation["items"][number];

/** Whether a line falls inside the discount's appliesTo/targetIds scope. */
function lineIsEligible(discount: IDiscount, line: ValidationLine): boolean {
    if (line.isGiftCard) return false;

    const appliesTo = (discount as any).appliesTo ?? "order";
    if (appliesTo === "order") return true;

    const targets = new Set(((discount as any).targetIds ?? []).map((t: unknown) => idKey(t)));
    if (targets.size === 0) return false;

    if (appliesTo === "product") return targets.has(idKey(line.productId));
    if (appliesTo === "category") return (line.categoryIds ?? []).some(id => targets.has(id));
    if (appliesTo === "collection") return (line.collectionIds ?? []).some(id => targets.has(id));
    return false;
}

function computeBuyXGetYAmount(cart: CartForValidation, discount: IDiscount): DiscountValidationResult {
    const bx = discount.buyXGetY;
    const productIds = bx?.getProductIds ?? [];
    if (!bx || !productIds.length || !(bx.buyQuantity >= 1) || !(bx.getQuantity >= 1)) {
        return {valid: false, reason: "buy_x_get_y_misconfigured"};
    }

    const eligible = new Set(productIds.map((id) => idKey(id)));
    const unitPrices: number[] = [];
    for (const item of cart.items) {
        if (item.isGiftCard || !eligible.has(idKey(item.productId))) continue;
        const qty = Math.max(0, Math.floor(item.quantity));
        for (let i = 0; i < qty; i++) {
            unitPrices.push(Number(item.unitPrice) || 0);
        }
    }

    const eligibleQty = unitPrices.length;
    const group = bx.buyQuantity + bx.getQuantity;
    if (eligibleQty < group) {
        return {valid: true, discountAmount: 0, discount};
    }

    unitPrices.sort((a, b) => a - b);
    const freeCount = Math.floor(eligibleQty / group) * bx.getQuantity;
    let discountAmount = 0;
    for (let i = 0; i < freeCount && i < unitPrices.length; i++) {
        discountAmount += unitPrices[i];
    }
    discountAmount = Math.min(discountAmount, cart.subtotal);

    return {valid: true, discountAmount: roundMoney(discountAmount), discount};
}

/**
 * Pure (no I/O) validation + amount for a discount against a priced cart.
 * Amounts are computed on the lines inside the discount's scope (appliesTo /
 * targetIds), gift-card lines excluded, capped at that eligible subtotal.
 * Per-customer limits need the database — see validateDiscountForCustomer.
 */
export function validateDiscount(cart: CartForValidation, discount: IDiscount): DiscountValidationResult {
    const now = new Date();

    if (!discount.isActive) {
        return {valid: false, reason: "discount_inactive"};
    }

    if (discount.startsAt && discount.startsAt > now) {
        return {valid: false, reason: "discount_not_started"};
    }

    if (discount.endsAt && discount.endsAt < now) {
        return {valid: false, reason: "discount_expired"};
    }

    if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) {
        return {valid: false, reason: "discount_usage_limit_reached"};
    }

    const merchandise = cart.items.filter(item => !item.isGiftCard);
    const merchandiseSubtotal = merchandise.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    if (discount.minimumOrderAmount != null && merchandiseSubtotal < discount.minimumOrderAmount) {
        return {valid: false, reason: "minimum_order_amount_not_met"};
    }

    const totalQty = merchandise.reduce((sum, item) => sum + item.quantity, 0);
    if (discount.minimumQuantity != null && totalQty < discount.minimumQuantity) {
        return {valid: false, reason: "minimum_quantity_not_met"};
    }

    if (discount.type === "free_shipping") {
        return {valid: true, discountAmount: 0, discount};
    }
    if (discount.type === "buy_x_get_y") {
        return computeBuyXGetYAmount(cart, discount);
    }

    const eligibleSubtotal = cart.items
        .filter(item => lineIsEligible(discount, item))
        .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (eligibleSubtotal <= 0) {
        return {valid: false, reason: "discount_not_applicable_to_cart"};
    }

    if (discount.type === "percentage") {
        const percent = Math.min(100, Math.max(0, discount.value));
        return {valid: true, discountAmount: roundMoney((eligibleSubtotal * percent) / 100), discount};
    }
    if (discount.type === "fixed") {
        return {valid: true, discountAmount: roundMoney(Math.min(discount.value, eligibleSubtotal)), discount};
    }

    return {valid: true, discountAmount: 0, discount};
}

/** Orders (not cancelled) in which this customer already used the discount. */
export async function countCustomerDiscountUses(
    discountId: ObjectId,
    customerId: ObjectId,
    companyId: ObjectId,
    session?: any,
): Promise<number> {
    return ProductOrder.countDocuments({
        company: companyId,
        customer: customerId,
        "appliedDiscounts.discount": discountId,
        status: {$ne: "cancelled"},
    }).noDeleted().session(session ?? null);
}

/** validateDiscount plus the per-customer usage limit (needs a DB lookup). */
export async function validateDiscountForCustomer(
    cart: CartForValidation,
    discount: IDiscount,
    companyId: ObjectId,
    session?: any,
): Promise<DiscountValidationResult> {
    const result = validateDiscount(cart, discount);
    if (!result.valid) return result;

    const perCustomer = discount.usageLimitPerCustomer;
    if (perCustomer != null && perCustomer > 0 && cart.customerId) {
        const used = await countCustomerDiscountUses(discount._id as ObjectId, cart.customerId, companyId, session);
        if (used >= perCustomer) return {valid: false, reason: "discount_customer_limit_reached"};
    }
    return result;
}
