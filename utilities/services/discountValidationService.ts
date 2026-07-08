import {ObjectId} from "mongodb";
import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";

export type CartForValidation = {
    subtotal: number;
    items: {productId: ObjectId; variantId?: ObjectId; quantity: number; categoryId?: ObjectId; collectionIds?: ObjectId[]}[];
    customerId?: ObjectId;
    appliedDiscountIds?: ObjectId[];
};

export type DiscountValidationResult =
    | {valid: true; discountAmount: number; discount: IDiscount}
    | {valid: false; reason: string};

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

    let discountAmount = 0;

    if (discount.type === "percentage") {
        discountAmount = (cart.subtotal * discount.value) / 100;
    } else if (discount.type === "fixed") {
        discountAmount = Math.min(discount.value, cart.subtotal);
    } else if (discount.type === "free_shipping") {
        discountAmount = 0;
    } else if (discount.type === "buy_x_get_y") {
        discountAmount = 0;
    }

    return {valid: true, discountAmount, discount};
}
