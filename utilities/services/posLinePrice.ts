import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";

/**
 * Product types the till cannot sell: gift cards and digital downloads are only
 * issued by the online order flow (fulfillOrderPaidExtras).
 */
export const POS_UNSELLABLE_TYPES = ["gift_card", "digital"];

export function assertPosSellable(product: {type: string}, languageCode: string): void {
    if (POS_UNSELLABLE_TYPES.includes(product.type)) {
        throw apiValidationException("pos_product_not_sellable", "productId", null, languageCode);
    }
}

/**
 * Server-side unit price for a POS line: the variant's price when a variant is
 * given, else the product's. Client-sent unit prices are never trusted — the
 * till UI doesn't edit prices, and discounts go through discountPercent (which
 * the manager-PIN rule covers). Rejects variants that don't belong to the product.
 */
export async function resolvePosLineUnitPrice(
    product: {_id: unknown; price?: number},
    variantId: string | undefined,
    ctx: {company: {_id: ObjectId}; languageCode: string; session?: ClientSession | null},
): Promise<number> {
    if (!variantId) return Number(product.price ?? 0);

    const variant = await ProductVariant.findOne(
        {_id: new ObjectId(variantId), product: product._id, company: ctx.company._id},
        {price: 1},
    ).noDeleted().session(ctx.session ?? null);
    if (!variant) throw apiValidationException("pos_variant_not_found", "variantId", null, ctx.languageCode);

    return Number(variant.price ?? product.price ?? 0);
}
