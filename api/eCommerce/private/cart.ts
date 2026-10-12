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
import {repriceCart, toValidationCart} from "@eCommerceModule/utilities/services/cartPricingService";
import {roundMoney} from "@eCommerceModule/utilities/services/money";
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

/** Re-prices, re-arms the abandoned-cart reminder, saves, and returns the DTO. */
async function repriceAndSave(cart: ICart, params: any): Promise<{data: ReturnType<typeof cartToDTO>}> {
    const {notices} = await repriceCart(cart as any, {
        companyId: params.company._id,
        userId: new ObjectId(params.actionUserCtx.userId),
        languageCode: params.languageCode,
    });
    cart.abandonedNotifiedAt = undefined;
    await cart.save();
    return {data: withNotices(cartToDTO(cart.toObject() as ICart), notices)};
}

function withNotices(dto: ReturnType<typeof cartToDTO>, notices: CartNotices) {
    return Object.keys(notices).length ? {...dto, notices} : dto;
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
        const {notices} = await repriceCart(cart as any, {
            companyId: company._id,
            userId: new ObjectId(actionUserCtx.userId),
            languageCode: params.languageCode,
        });
        if (JSON.stringify([cart.items, cart.subtotal, cart.discountTotal, cart.appliedGiftCard]) !== before) {
            await cart.save();
        }
        return {data: withNotices(cartToDTO(cart.toObject() as ICart), notices)};
    }),
);

// PUT item into cart
router.put(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(addCartItemFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, productId, variantId, quantity} = params;

        const product: any = await Product.findOne({
            _id: new ObjectId(productId),
            company: company._id,
            status: "active",
        }).noDeleted().lean();
        if (!product) throw apiValidationException("product_not_found", "", null, languageCode);

        if (product.hasVariants && !variantId) {
            throw apiValidationException("variant_required", "variantId", null, languageCode);
        }
        if (variantId) {
            const variantDoc = await ProductVariant.findOne({
                _id: new ObjectId(variantId),
                product: product._id,
                company: company._id,
                status: "active",
            }).noDeleted().lean();
            if (!variantDoc) throw apiValidationException("variant_not_found", "", null, languageCode);
        }

        const filter = {company: company._id, user: actionUserCtx.userId};
        let cart = await Cart.findOne(filter);

        // One cart, one currency: totals and the payment are in a single currency
        const firstLine = (cart?.items as any[] | undefined)?.[0];
        if (firstLine && product.currency) {
            const firstProduct: any = await Product.findOne(
                {_id: firstLine.product?._id ?? firstLine.product, company: company._id},
                {currency: 1},
            ).lean();
            if (firstProduct?.currency && firstProduct.currency.toString() !== product.currency.toString()) {
                throw apiValidationException("cart_currency_mismatch", "productId", null, languageCode);
            }
        }

        if (!cart) {
            assertQuantityAllowed(product, quantity, languageCode);

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            // unitPrice/totals are placeholders — repriceAndSave sets them from the catalog
            cart = new Cart({
                ...filter,
                items: [{
                    product: product._id,
                    variant: variantId ? new ObjectId(variantId) : undefined,
                    quantity,
                    unitPrice: 0,
                    totalPrice: 0,
                    snapshot: {title: product.title},
                }],
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
            } else {
                assertQuantityAllowed(product, quantity, languageCode);
                (cart.items as any[]).push({
                    product: product._id,
                    variant: variantId ? new ObjectId(variantId) : undefined,
                    quantity,
                    unitPrice: 0,
                    totalPrice: 0,
                    snapshot: {title: product.title},
                });
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
            const product = await Product.findOne({_id: item.product?._id ?? item.product, company: company._id}).lean();
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

        const now = new Date();
        const discount = await Discount.findOne({
            company: company._id,
            code: code.trim().toUpperCase(),
            isActive: true,
            startsAt: {$lte: now},
            $or: [{endsAt: null}, {endsAt: {$gte: now}}],
        }).noDeleted();
        if (!discount) return {valid: false, message: "discount_not_found"};

        const userId = new ObjectId(actionUserCtx.userId);
        const ctx = {companyId: company._id, userId, languageCode};

        // Validate against freshly priced lines (never against stale stored totals)
        cart.appliedDiscounts = [];
        const {meta} = await repriceCart(cart as any, ctx);
        const result = await validateDiscountForCustomer(toValidationCart(cart as any, meta, userId), discount, company._id);
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

        const giftCard = await giftCardService.findRedeemable(code, company._id, {logger, languageCode});
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
        await cart.save();
        return {data: cartToDTO(cart.toObject() as ICart)};
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
