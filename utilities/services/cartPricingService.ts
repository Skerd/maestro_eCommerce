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
import {collectionIdsByProduct} from "@eCommerceModule/utilities/services/collection/collectionMembership";
import type {CartNotices} from "armonia/src/modules/eCommerce/api/eCommerce/private/cart/cart.dto";

/** The priced fields shared by Cart and Checkout documents. */
export type PriceableLine = {
    product: unknown;
    variant?: unknown;
    sellerCompany?: unknown;
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
    /** When true, lines may belong to different seller companies (platform cart). */
    multiSeller?: boolean;
};

/** Catalog facts about a priced line, used by discounts, shipping and tax, and shown on the cart line. */
export type LineCatalogMeta = {
    productId: string;
    slug?: string;
    /** The product's order-quantity rules, so the storefront steps quantities the way the API enforces them. */
    quantityRules: {min: number; max?: number; step: number};
    categoryIds: string[];
    collectionIds: string[];
    isGiftCard: boolean;
    weight: number;
    sellerCompanyId?: string;
};

function idOf(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "object" && "_id" in (value as object)) return String((value as {_id: unknown})._id);
    return String(value);
}

export function distinctSellerCompanyIds(items: PriceableLine[]): string[] {
    const ids = new Set<string>();
    for (const item of items) {
        const id = idOf(item.sellerCompany);
        if (id) ids.add(id);
    }
    return [...ids];
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

    const productFilter: Record<string, unknown> = {_id: {$in: productIds}, status: "active"};
    const variantFilter: Record<string, unknown> = {_id: {$in: variantIds}, status: "active"};
    if (!ctx.multiSeller) {
        productFilter.company = ctx.companyId;
        variantFilter.company = ctx.companyId;
    }

    const [products, variants] = await Promise.all([
        Product.find(
            productFilter,
            {title: 1, slug: 1, sku: 1, price: 1, mainImage: 1, categories: 1, type: 1, hasVariants: 1, weight: 1, minOrderQty: 1, maxOrderQty: 1, stepQty: 1, company: 1},
        ).noDeleted().session(ctx.session ?? null).lean(),
        variantIds.length
            ? ProductVariant.find(
                  variantFilter,
                  {product: 1, sku: 1, price: 1, mainImage: 1, company: 1},
              ).noDeleted().session(ctx.session ?? null).lean()
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
        item.sellerCompany = product.company;
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

    const sellerIds = distinctSellerCompanyIds(doc.items);
    const multiSeller = ctx.multiSeller && sellerIds.length > 1;

    // Collection membership + meta (collections are company-scoped; look up per seller)
    const meta: LineCatalogMeta[] = [];
    for (const item of doc.items) {
        const product: any = productMap.get(idOf(item.product));
        const sellerId = idOf(item.sellerCompany) || String(ctx.companyId);
        const collectionsByProduct = await collectionIdsByProduct(
            [new ObjectId(idOf(item.product))],
            new ObjectId(sellerId),
            ctx.session,
        );
        meta.push({
            productId: idOf(item.product),
            slug: product?.slug,
            quantityRules: {
                min: Math.max(1, product?.minOrderQty ?? 1),
                max: product?.maxOrderQty > 0 ? product.maxOrderQty : undefined,
                step: Math.max(1, product?.stepQty ?? 1),
            },
            categoryIds: (product?.categories ?? []).map(idOf),
            collectionIds: collectionsByProduct.get(idOf(item.product)) ?? [],
            isGiftCard: product?.type === "gift_card",
            weight: Number(product?.weight ?? 0) * item.quantity,
            sellerCompanyId: sellerId,
        });
    }

    // 2. Pricing rules — per seller group when multi-seller
    if (multiSeller) {
        for (const sellerId of sellerIds) {
            const indexes = doc.items
                .map((item, idx) => (idOf(item.sellerCompany) === sellerId ? idx : -1))
                .filter(idx => idx >= 0);
            const groupItems = indexes.map(idx => doc.items[idx]);
            const groupMeta = indexes.map(idx => meta[idx]);
            const baseSubtotal = groupItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
            const customerGroupIds = ctx.userId
                ? await getCustomerGroupIdsForUser(ctx.userId, new ObjectId(sellerId))
                : [];
            const pricing = await calculatePricing(
                {
                    subtotal: baseSubtotal,
                    customerGroupIds,
                    items: groupItems.map((item, i) => ({
                        productId: groupMeta[i].productId,
                        variantId: item.variant ? idOf(item.variant) : undefined,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        categoryId: groupMeta[i].categoryIds[0],
                        collectionIds: groupMeta[i].collectionIds,
                    })),
                },
                new ObjectId(sellerId),
            );
            pricing.adjustedLines.forEach((line, i) => {
                const item = doc.items[indexes[i]];
                item.unitPrice = roundMoney(line.unitPrice);
                item.totalPrice = roundMoney(item.unitPrice * item.quantity);
            });
        }
        // Multi-seller: drop company-scoped promos
        if (doc.appliedDiscounts?.length) {
            notices.discountRemoved = "cart_multi_seller_promo";
            doc.appliedDiscounts = [];
        }
        if (doc.appliedGiftCard) {
            notices.giftCardRemoved = true;
            doc.appliedGiftCard = undefined;
        }
        doc.discountTotal = 0;
    } else {
        const pricingCompanyId = sellerIds[0] ? new ObjectId(sellerIds[0]) : ctx.companyId;
        const baseSubtotal = doc.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const customerGroupIds = ctx.userId ? await getCustomerGroupIdsForUser(ctx.userId, pricingCompanyId) : [];
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
            pricingCompanyId,
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
            const discount = await Discount.findOne({_id: idOf(applied.discount), company: pricingCompanyId}).noDeleted().session(ctx.session ?? null);
            const result = discount
                ? await validateDiscountForCustomer(
                      toValidationCart(doc, meta, ctx.userId),
                      discount,
                      pricingCompanyId,
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
            const card = await giftCardService.findRedeemable(doc.appliedGiftCard.code, pricingCompanyId, {
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
    }

    if (multiSeller) {
        doc.subtotal = roundMoney(doc.items.reduce((sum, item) => sum + item.totalPrice, 0));
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
