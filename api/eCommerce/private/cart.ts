import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Cart, {ICart} from "@eCommerceModule/database/schemas/cart/cart";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {cartToDTO} from "@eCommerceModule/utilities/mappers/cart/cartMapper.dto";
import {validateDiscountForCustomer} from "@eCommerceModule/utilities/services/discountValidationService";
import {
    distinctSellerCompanyIds,
    type LineCatalogMeta,
    repriceCart,
    toValidationCart,
} from "@eCommerceModule/utilities/services/cartPricingService";
import {roundMoney} from "@coreModule/utilities/helpers/money";
import {isPlatformShopOrigin} from "@coreModule/utilities/marketing/platformShopOrigin";
import {
    addCartItemFormSchema,
    applyCartCodeFormSchema,
    updateCartItemFormSchema,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/cart/cart.form.validator";
import type {CartNotices} from "armonia/src/modules/eCommerce/api/eCommerce/private/cart/cart.dto";

/**
 * Cart is authenticated-only: every route requires a JWT (storefront asks the
 * buyer to sign in before adding to cart). Prices are never trusted from the
 * stored line: every mutation (and every read) re-prices from the live catalog
 * via repriceCart, which also re-validates the applied discount.
 */

export const basePath = "/api/eCommerce/cart";
export const router = Router();

/** Enforces the product's minOrderQty / maxOrderQty / stepQty on a target quantity. */
function assertQuantityAllowed(product: any, quantity: number, languageCode: string): void {
    const min = product.minOrderQty ?? 1;
    const max = product.maxOrderQty;
    const step = product.stepQty;

    if (quantity < min) throw apiValidationException("quantity_below_minimum", "quantity", null, languageCode);
    if (max != null && max > 0 && quantity > max) throw apiValidationException("quantity_above_maximum", "quantity", null, languageCode);
    if (step != null && step > 1 && (quantity - min) % step !== 0) {
        throw apiValidationException("quantity_step_mismatch", "quantity", null, languageCode);
    }
}

function pricingOptions(params: any) {
    return {
        companyId: params.company._id as ObjectId,
        userId: new ObjectId(params.actionUserCtx.userId),
        languageCode: params.languageCode as string,
        multiSeller: isPlatformShopOrigin(params.origin),
    };
}

/** Re-prices, re-arms the abandoned-cart reminder, saves, and returns the DTO. */
async function repriceAndSave(cart: ICart, params: any): Promise<{data: ReturnType<typeof cartToDTO>}> {
    const {notices, meta} = await repriceCart(cart as any, pricingOptions(params));
    cart.abandonedNotifiedAt = undefined;
    await cart.save();
    await cart.populate("items.sellerCompany", "name shopSlug shopHost");
    return {data: toCartResponse(cart, notices, meta)};
}

/** The cart DTO plus what the storefront needs per line (product link, quantity rules) and any re-pricing notices. */
function toCartResponse(cart: ICart, notices: CartNotices, meta: LineCatalogMeta[]) {
    const dto = cartToDTO(cart.toObject() as ICart);
    // meta is built from the re-priced lines, in the same order as cart.items
    dto.items = dto.items.map((item, index) => ({
        ...item,
        product: {...item.product, slug: meta[index]?.slug},
        quantityRules: meta[index]?.quantityRules,
    }));
    return Object.keys(notices).length ? {...dto, notices} : dto;
}

function assertSingleSellerPromo(cart: ICart, languageCode: string): void {
    if (distinctSellerCompanyIds(cart.items as any).length > 1) {
        throw apiValidationException("cart_multi_seller_promo", "code", null, languageCode);
    }
}

// GET cart — re-priced on read so the buyer always sees live prices
router.get(
    "/",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx} = params;

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) return {data: null};

        const before = JSON.stringify([cart.items, cart.subtotal, cart.discountTotal, cart.appliedGiftCard]);
        const {notices, meta} = await repriceCart(cart as any, pricingOptions(params));
        if (JSON.stringify([cart.items, cart.subtotal, cart.discountTotal, cart.appliedGiftCard]) !== before) {
            await cart.save();
        }
        await cart.populate("items.sellerCompany", "name shopSlug shopHost");
        return {data: toCartResponse(cart, notices, meta)};
    }),
);

// PUT item into cart
router.put(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(addCartItemFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, productId, variantId, quantity, origin} = params;
        const platform = isPlatformShopOrigin(origin);

        const productQuery: Record<string, unknown> = {
            _id: new ObjectId(productId),
            status: "active",
        };
        if (!platform) productQuery.company = company._id;

        const product: any = await Product.findOne(productQuery).noDeleted().lean();
        if (!product) throw apiValidationException("product_not_found", "", null, languageCode);

        const sellerCompanyId = product.company;

        if (product.hasVariants && !variantId) {
            throw apiValidationException("variant_required", "variantId", null, languageCode);
        }
        if (variantId) {
            const variantDoc = await ProductVariant.findOne({
                _id: new ObjectId(variantId),
                product: product._id,
                company: sellerCompanyId,
                status: "active",
            }).noDeleted().lean();
            if (!variantDoc) throw apiValidationException("variant_not_found", "", null, languageCode);
        }

        const filter = {company: company._id, user: actionUserCtx.userId};
        let cart = await Cart.findOne(filter);

        // One cart, one currency: totals and the payment are in a single currency
        const firstLine = (cart?.items as any[] | undefined)?.[0];
        if (firstLine && product.currency) {
            const firstProductQuery: Record<string, unknown> = {
                _id: firstLine.product?._id ?? firstLine.product,
            };
            if (!platform) firstProductQuery.company = company._id;
            const firstProduct: any = await Product.findOne(firstProductQuery, {currency: 1}).lean();
            if (firstProduct?.currency && firstProduct.currency.toString() !== product.currency.toString()) {
                throw apiValidationException("cart_currency_mismatch", "productId", null, languageCode);
            }
        }

        const linePayload = {
            product: product._id,
            variant: variantId ? new ObjectId(variantId) : undefined,
            sellerCompany: sellerCompanyId,
            quantity,
            unitPrice: 0,
            totalPrice: 0,
            snapshot: {title: product.title},
        };

        if (!cart) {
            assertQuantityAllowed(product, quantity, languageCode);

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            // unitPrice/totals are placeholders — repriceAndSave sets them from the catalog
            cart = new Cart({
                ...filter,
                items: [linePayload],
                subtotal: 0,
                discountTotal: 0,
                expiresAt,
            });
        } else {
            const existing = (cart.items as any[]).find((item: any) =>
                (item.product?._id ?? item.product).toString() === productId
                && (item.variant?.toString() ?? undefined) === (variantId ?? undefined),
            );

            if (existing) {
                assertQuantityAllowed(product, existing.quantity + quantity, languageCode);
                existing.quantity += quantity;
                existing.sellerCompany = sellerCompanyId;
            } else {
                assertQuantityAllowed(product, quantity, languageCode);
                (cart.items as any[]).push(linePayload);
            }
        }

        return repriceAndSave(cart, params);
    }),
);

// PATCH item quantity (0 removes the line)
router.patch(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(updateCartItemFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, itemId, quantity} = params;

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        const item = (cart.items as any[]).find((i: any) => i._id?.toString() === itemId);
        if (!item) throw apiValidationException("item_not_found", "", null, languageCode);

        if (quantity <= 0) {
            cart.items = (cart.items as any[]).filter((i: any) => i._id?.toString() !== itemId) as any;
        } else {
            const sellerId = item.sellerCompany?._id ?? item.sellerCompany ?? company._id;
            const product = await Product.findOne({_id: item.product?._id ?? item.product, company: sellerId}).lean();
            if (product) assertQuantityAllowed(product, quantity, languageCode);
            item.quantity = quantity;
        }

        return repriceAndSave(cart, params);
    }),
);

// DELETE item
router.delete(
    "/item/:itemId",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any, queryParams: any) => {
        const {languageCode, company, actionUserCtx} = params;
        const {itemId} = queryParams;
        if (!ObjectId.isValid(itemId)) throw apiValidationException("item_not_found", "", null, languageCode);

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        cart.items = (cart.items as any[]).filter((i: any) => i._id?.toString() !== itemId) as any;
        return repriceAndSave(cart, params);
    }),
);

// Apply discount code
router.post(
    "/apply-discount",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(applyCartCodeFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, code} = params;

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);
        assertSingleSellerPromo(cart, languageCode);

        const sellerIds = distinctSellerCompanyIds(cart.items as any);
        const promoCompanyId = sellerIds[0] ? new ObjectId(sellerIds[0]) : company._id;

        const now = new Date();
        const discount = await Discount.findOne({
            company: promoCompanyId,
            code: code.trim().toUpperCase(),
            isActive: true,
            startsAt: {$lte: now},
            $or: [{endsAt: null}, {endsAt: {$gte: now}}],
        }).noDeleted();
        if (!discount) return {valid: false, message: "discount_not_found"};

        const userId = new ObjectId(actionUserCtx.userId);
        const ctx = pricingOptions(params);

        // Validate against freshly priced lines (never against stale stored totals)
        cart.appliedDiscounts = [];
        const {meta} = await repriceCart(cart as any, ctx);
        const result = await validateDiscountForCustomer(toValidationCart(cart as any, meta, userId), discount, promoCompanyId);
        if (result.valid === false) return {valid: false, message: result.reason};

        cart.appliedDiscounts = [{discount: discount._id, code: discount.code, amount: result.discountAmount}] as any;
        const saved = await repriceAndSave(cart, params);
        return {valid: true, data: saved.data, discountAmount: cart.discountTotal};
    }),
);

// Remove the applied discount code
router.delete(
    "/discount",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx} = params;

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        cart.appliedDiscounts = [];
        return repriceAndSave(cart, params);
    }),
);

// Apply gift card (store credit) — amount re-capped on every reprice and at checkout
router.post(
    "/apply-gift-card",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(applyCartCodeFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, code} = params;

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);
        assertSingleSellerPromo(cart, languageCode);

        const sellerIds = distinctSellerCompanyIds(cart.items as any);
        const promoCompanyId = sellerIds[0] ? new ObjectId(sellerIds[0]) : company._id;

        const giftCard = await giftCardService.findRedeemable(code, promoCompanyId, {logger, languageCode});
        if (!giftCard) return {valid: false, message: "gift_card_not_redeemable"};

        cart.appliedGiftCard = {
            giftCard: giftCard._id as any,
            code: giftCard.code,
            amount: roundMoney(Math.min(giftCard.balance, Math.max(0, cart.subtotal - (cart.discountTotal ?? 0)))),
        };
        const saved = await repriceAndSave(cart, params);
        return {valid: true, data: saved.data, giftCardAmount: cart.appliedGiftCard?.amount ?? 0, balance: giftCard.balance};
    }),
);

// Remove applied gift card
router.delete(
    "/gift-card",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx} = params;

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        cart.appliedGiftCard = undefined;
        return repriceAndSave(cart, params);
    }),
);

// Clear cart (items, discount and store credit)
router.delete(
    "/clear",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx} = params;

        await Cart.findOneAndUpdate(
            {company: company._id, user: actionUserCtx.userId},
            {$set: {items: [], subtotal: 0, discountTotal: 0, appliedDiscounts: []}, $unset: {appliedGiftCard: 1}},
        );
        return {message: "Cart cleared"};
    }),
);
