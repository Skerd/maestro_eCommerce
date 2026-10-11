import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import {calculatePricing, getCustomerGroupIdsForUser} from "@eCommerceModule/utilities/services/pricingCalculationService";
import {
    validateDiscountForCustomer,
    type CartForValidation,
} from "@eCommerceModule/utilities/services/discountValidationService";
import {roundMoney} from "@eCommerceModule/utilities/services/money";
import type {CartNotices} from "armonia/src/modules/eCommerce/api/eCommerce/private/cart/cart.dto";

/** The priced fields shared by Cart and Checkout documents. */
export type PriceableLine = {
    product: unknown;
    variant?: unknown;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    snapshot?: {title?: string; sku?: string; imageUrl?: string};
};

export type PriceableDoc = {
    items: PriceableLine[];
    subtotal: number;
    discountTotal: number;
    appliedDiscounts?: {discount: unknown; code?: string; amount: number}[];
    appliedGiftCard?: {giftCard: unknown; code: string; amount: number};
};

type PricingCtx = {
    companyId: ObjectId;
    userId?: ObjectId;
    languageCode: string;
    session?: ClientSession | null;
};

/** Catalog facts about a priced line, used by discounts, shipping and tax. */
export type LineCatalogMeta = {
    productId: string;
    categoryIds: string[];
    collectionIds: string[];
    isGiftCard: boolean;
    weight: number;
};

function idOf(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "object" && "_id" in (value as object)) return String((value as {_id: unknown})._id);
    return String(value);
}

/**
 * Re-prices a cart (or checkout) in place from the live catalog:
 *  - lines whose product/variant is no longer sold are dropped,
 *  - each line's unit price restarts from the product/variant base price, then
 *    pricing rules apply once (never on an already-adjusted price),
 *  - the applied discount is re-validated against the new lines (removed when
 *    it no longer qualifies) and its amount recomputed,
 *  - the gift-card amount is re-capped to the live balance and remaining total.
 * Returns what changed so the buyer can be told.
 */
export async function repriceCart(doc: PriceableDoc, ctx: PricingCtx): Promise<{notices: CartNotices; meta: LineCatalogMeta[]}> {
    const notices: CartNotices = {};
    const productIds = [...new Set(doc.items.map(item => idOf(item.product)))].map(id => new ObjectId(id));
    const variantIds = doc.items.filter(item => item.variant).map(item => new ObjectId(idOf(item.variant)));

    const [products, variants] = await Promise.all([
        Product.find(
            {_id: {$in: productIds}, company: ctx.companyId, status: "active"},
            {title: 1, sku: 1, price: 1, mainImage: 1, categories: 1, collections: 1, type: 1, hasVariants: 1, weight: 1},
        ).noDeleted().session(ctx.session ?? null).lean(),
        variantIds.length
            ? ProductVariant.find(
                  {_id: {$in: variantIds}, company: ctx.companyId, status: "active"},
                  {product: 1, sku: 1, price: 1, mainImage: 1},
              ).session(ctx.session ?? null).lean()
            : Promise.resolve([]),
    ]);
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
    const variantMap = new Map((variants as any[]).map(v => [v._id.toString(), v]));

    // 1. Drop unsellable lines, reset unit prices to the catalog base price
    const removed: string[] = [];
    const kept: PriceableLine[] = [];
    for (const item of doc.items) {
        const product: any = productMap.get(idOf(item.product));
        const variant: any = item.variant ? variantMap.get(idOf(item.variant)) : null;
        const variantOk = item.variant ? variant && idOf(variant.product) === idOf(product?._id) : !product?.hasVariants;
        if (!product || !variantOk) {
            removed.push(item.snapshot?.title || product?.title || "");
            continue;
        }
        item.unitPrice = Number(variant?.price ?? product.price ?? 0);
        item.snapshot = {
            title: product.title,
            sku: variant?.sku ?? product.sku,
            imageUrl: (variant?.mainImage ?? product.mainImage)?.toString(),
        };
        kept.push(item);
    }
    if (removed.length) notices.removedItems = removed.filter(Boolean);
    doc.items.splice(0, doc.items.length, ...kept);

    const meta: LineCatalogMeta[] = doc.items.map(item => {
        const product: any = productMap.get(idOf(item.product));
        return {
            productId: idOf(item.product),
            categoryIds: (product?.categories ?? []).map(idOf),
            collectionIds: (product?.collections ?? []).map(idOf),
            isGiftCard: product?.type === "gift_card",
            weight: Number(product?.weight ?? 0) * item.quantity,
        };
    });

    // 2. Pricing rules, applied once to the base price
    const baseSubtotal = doc.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const customerGroupIds = ctx.userId ? await getCustomerGroupIdsForUser(ctx.userId, ctx.companyId) : [];
    const pricing = await calculatePricing(
        {
            subtotal: baseSubtotal,
            customerGroupIds,
            items: doc.items.map((item, idx) => ({
                productId: meta[idx].productId,
                variantId: item.variant ? idOf(item.variant) : undefined,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                categoryId: meta[idx].categoryIds[0],
                collectionIds: meta[idx].collectionIds,
            })),
        },
        ctx.companyId,
    );
    pricing.adjustedLines.forEach((line, idx) => {
        const item = doc.items[idx];
        item.unitPrice = roundMoney(line.unitPrice);
        item.totalPrice = roundMoney(item.unitPrice * item.quantity);
    });
    doc.subtotal = roundMoney(doc.items.reduce((sum, item) => sum + item.totalPrice, 0));

    // 3. Re-validate the applied discount against the re-priced lines
    const applied = doc.appliedDiscounts?.[0];
    if (applied) {
        const discount = await Discount.findOne({_id: idOf(applied.discount), company: ctx.companyId}).session(ctx.session ?? null);
        const result = discount
            ? await validateDiscountForCustomer(
                  toValidationCart(doc, meta, ctx.userId),
                  discount,
                  ctx.companyId,
                  ctx.session,
              )
            : ({valid: false, reason: "discount_not_found"} as const);
        if (result.valid === true) {
            applied.amount = result.discountAmount;
            doc.discountTotal = result.discountAmount;
        } else if (result.valid === false) {
            notices.discountRemoved = result.reason;
            doc.appliedDiscounts = [];
            doc.discountTotal = 0;
        }
    } else {
        doc.discountTotal = 0;
    }

    // 4. Re-cap store credit against the live balance
    if (doc.appliedGiftCard?.code) {
        const card = await giftCardService.findRedeemable(doc.appliedGiftCard.code, ctx.companyId, {
            languageCode: ctx.languageCode,
            session: ctx.session ?? undefined,
        });
        if (card) {
            doc.appliedGiftCard.amount = roundMoney(Math.min(card.balance, Math.max(0, doc.subtotal - doc.discountTotal)));
        } else {
            notices.giftCardRemoved = true;
            doc.appliedGiftCard = undefined;
        }
    }

    return {notices, meta};
}

/** Builds the discount-validation view of a priced cart. */
export function toValidationCart(doc: PriceableDoc, meta: LineCatalogMeta[], customerId?: ObjectId): CartForValidation {
    return {
        subtotal: doc.subtotal,
        customerId,
        items: doc.items.map((item, idx) => ({
            productId: new ObjectId(meta[idx].productId),
            variantId: item.variant ? new ObjectId(idOf(item.variant)) : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            categoryIds: meta[idx].categoryIds,
            collectionIds: meta[idx].collectionIds,
            isGiftCard: meta[idx].isGiftCard,
        })),
    };
}
