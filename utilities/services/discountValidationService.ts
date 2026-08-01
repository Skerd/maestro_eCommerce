import {ObjectId} from "mongodb";
import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";

export type CartForValidation = {
    subtotal: number;
    items: {
        productId: ObjectId;
        variantId?: ObjectId;
        quantity: number;
        unitPrice: number;
        categoryId?: ObjectId;
        collectionIds?: ObjectId[];
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

function computeBuyXGetYAmount(cart: CartForValidation, discount: IDiscount): DiscountValidationResult {
    const bx = discount.buyXGetY;
    const productIds = bx?.getProductIds ?? [];
    if (!bx || !productIds.length || !(bx.buyQuantity >= 1) || !(bx.getQuantity >= 1)) {
        return {valid: false, reason: "buy_x_get_y_misconfigured"};
    }

    const eligible = new Set(productIds.map((id) => idKey(id)));
    const unitPrices: number[] = [];
    for (const item of cart.items) {
        if (!eligible.has(idKey(item.productId))) continue;
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

    return {valid: true, discountAmount, discount};
}

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

    if (discount.minimumOrderAmount != null && cart.subtotal < discount.minimumOrderAmount) {
        return {valid: false, reason: "minimum_order_amount_not_met"};
    }

    const totalQty = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    if (discount.minimumQuantity != null && totalQty < discount.minimumQuantity) {
        return {valid: false, reason: "minimum_quantity_not_met"};
    }

    if (discount.type === "percentage") {
        return {valid: true, discountAmount: (cart.subtotal * discount.value) / 100, discount};
    }
    if (discount.type === "fixed") {
        return {valid: true, discountAmount: Math.min(discount.value, cart.subtotal), discount};
    }
    if (discount.type === "free_shipping") {
        return {valid: true, discountAmount: 0, discount};
    }
    if (discount.type === "buy_x_get_y") {
        return computeBuyXGetYAmount(cart, discount);
    }

    return {valid: true, discountAmount: 0, discount};
}
