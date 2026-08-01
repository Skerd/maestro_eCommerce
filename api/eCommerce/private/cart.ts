import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import {cartService} from "@eCommerceModule/database/schemas/cart/cart.service";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {cartToDTO} from "@eCommerceModule/utilities/mappers/cart/cartMapper.dto";
import {validateDiscount} from "@eCommerceModule/utilities/services/discountValidationService";
import {
    calculatePricing,
    enrichCartLinesWithProductMeta,
    getCustomerGroupIdsForUser,
} from "@eCommerceModule/utilities/services/pricingCalculationService";

/**
 * Cart is authenticated-only: every route requires a JWT (storefront asks the
 * buyer to sign in before adding to cart). The earlier guest-token support was
 * phantom — the Cart schema never had a guestToken path.
 */

async function applyPricingToCart(cart: any, companyId: ObjectId, userId?: ObjectId): Promise<void> {
    const rawItems = (cart.items as any[]).map((item) => ({
        product: item.product?._id ?? item.product,
        variant: item.variant?._id ?? item.variant,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
    }));

    const lines = await enrichCartLinesWithProductMeta(rawItems, companyId);
    const customerGroupIds = userId ? await getCustomerGroupIdsForUser(userId, companyId) : [];
    const originalSubtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const pricing = await calculatePricing({subtotal: originalSubtotal, items: lines, customerGroupIds}, companyId);

    pricing.adjustedLines.forEach((adjLine, idx) => {
        const item = (cart.items as any[])[idx];
        if (!item) return;
        item.unitPrice = adjLine.unitPrice;
        item.totalPrice = adjLine.unitPrice * item.quantity;
    });

    cart.subtotal = pricing.adjustedSubtotal;
}

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

// GET cart
router.get(
    "/",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx} = params;

        const cart = await cartService.findOne(
            {company: company._id, user: actionUserCtx.userId},
            {logger: params.logger, languageCode: params.languageCode},
            [{path: "items.product", select: "title price mainImage slug"}],
        );
        if (!cart) return {data: null};
        return {data: cartToDTO(cart)};
    }),
);

// PUT item into cart
router.put(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, productId, variantId, quantity} = params;

        if (!productId || !quantity || quantity < 1) {
            throw apiValidationException("product_and_quantity_required", "", null, languageCode);
        }

        const product = await Product.findOne({_id: new ObjectId(productId), company: company._id, status: "active"}).lean();
        if (!product) throw apiValidationException("product_not_found", "", null, languageCode);

        let unitPrice = (product as any).price ?? 0;
        let variantDoc: any = null;

        if (variantId) {
            variantDoc = await ProductVariant.findOne({_id: new ObjectId(variantId), product: product._id}).lean();
            if (!variantDoc) throw apiValidationException("variant_not_found", "", null, languageCode);
            unitPrice = variantDoc.price ?? unitPrice;
        }

        const filter = {company: company._id, user: actionUserCtx.userId};
        let cart = await Cart.findOne(filter);

        const snapshot = {
            title: (product as any).title,
            sku: variantDoc?.sku ?? (product as any).sku,
            imageUrl: (product as any).mainImage?.toString(),
        };

        if (!cart) {
            assertQuantityAllowed(product, quantity, languageCode);

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            cart = new Cart({
                ...filter,
                items: [{
                    product: new ObjectId(productId),
                    variant: variantId ? new ObjectId(variantId) : undefined,
                    quantity,
                    unitPrice,
                    totalPrice: unitPrice * quantity,
                    snapshot,
                }],
                subtotal: unitPrice * quantity,
                discountTotal: 0,
                expiresAt,
            });
        } else {
            const existingIdx = cart.items.findIndex((item: any) => {
                const itemProduct = item.product?.toString() ?? item.product;
                const itemVariant = item.variant?.toString();
                return itemProduct === productId && itemVariant === variantId;
            });

            if (existingIdx >= 0) {
                const item = cart.items[existingIdx] as any;
                assertQuantityAllowed(product, item.quantity + quantity, languageCode);
                item.quantity += quantity;
                item.totalPrice = item.unitPrice * item.quantity;
            } else {
                assertQuantityAllowed(product, quantity, languageCode);
                (cart.items as any[]).push({
                    product: new ObjectId(productId),
                    variant: variantId ? new ObjectId(variantId) : undefined,
                    quantity,
                    unitPrice,
                    totalPrice: unitPrice * quantity,
                    snapshot,
                });
            }

            cart.subtotal = (cart.items as any[]).reduce((s: number, i: any) => s + i.totalPrice, 0);
        }

        await applyPricingToCart(cart, company._id, new ObjectId(actionUserCtx.userId));
        await cart.save();
        return {data: cartToDTO(cart.toObject())};
    }),
);

// PATCH item quantity
router.patch(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, itemId, quantity} = params;

        if (!itemId) throw apiValidationException("item_id_required", "", null, languageCode);

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        const item = (cart.items as any[]).find((i: any) => i._id?.toString() === itemId);
        if (!item) throw apiValidationException("item_not_found", "", null, languageCode);

        if (quantity <= 0) {
            cart.items = (cart.items as any[]).filter((i: any) => i._id?.toString() !== itemId) as any;
        } else {
            const productId = item.product?._id ?? item.product;
            const product = await Product.findOne({_id: productId, company: company._id}).lean();
            if (product) assertQuantityAllowed(product, quantity, languageCode);
            item.quantity = quantity;
            item.totalPrice = item.unitPrice * quantity;
        }

        cart.subtotal = cart.items.reduce((s: number, i) => s + i.totalPrice, 0);
        await applyPricingToCart(cart, company._id, new ObjectId(actionUserCtx.userId));
        await cart.save();
        return {data: cartToDTO(cart.toObject())};
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

        const cart = await Cart.findOneAndUpdate(
            {company: company._id, user: actionUserCtx.userId},
            {$pull: {items: {_id: new ObjectId(itemId)}}},
            {new: true},
        );
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        cart.subtotal = cart.items.reduce((s: number, i) => s + i.totalPrice, 0);
        await applyPricingToCart(cart, company._id, new ObjectId(actionUserCtx.userId));
        await cart.save();
        return {data: cartToDTO(cart.toObject())};
    }),
);

// Apply discount code
router.post(
    "/apply-discount",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, code} = params;

        if (!code) throw apiValidationException("code_required", "", null, languageCode);

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        const now = new Date();
        const discount = await Discount.findOne({
            company: company._id,
            code: code.trim().toUpperCase(),
            isActive: true,
            startsAt: {$lte: now},
            $or: [{endsAt: null}, {endsAt: {$gte: now}}],
        });

        if (!discount) return {valid: false, message: "discount_not_found"};

        const items = (cart.items as any[]).map((item) => ({
            productId: (item.product?._id ?? item.product) as ObjectId,
            variantId: item.variant ? ((item.variant._id ?? item.variant) as ObjectId) : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        }));
        const result = validateDiscount({subtotal: cart.subtotal, items}, discount);
        if (result.valid === false) return {valid: false, message: result.reason};

        cart.discountTotal = result.discountAmount;
        cart.appliedDiscounts = [{discount: discount._id, code: discount.code, amount: result.discountAmount}] as any;
        await cart.save();

        return {valid: true, data: cartToDTO(cart.toObject()), discountAmount: result.discountAmount};
    }),
);

// Apply gift card (store credit) — amount capped later at checkout totals
router.post(
    "/apply-gift-card",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, code} = params;

        if (!code) throw apiValidationException("code_required", "", null, languageCode);

        const cart = await Cart.findOne({company: company._id, user: actionUserCtx.userId});
        if (!cart) throw apiValidationException("cart_not_found", "", null, languageCode);

        const giftCard = await giftCardService.findRedeemable(code, company._id, {logger, languageCode});
        if (!giftCard) return {valid: false, message: "gift_card_not_redeemable"};

        const cartTotal = Math.max(0, cart.subtotal - (cart.discountTotal ?? 0));
        const amount = Math.min(giftCard.balance, cartTotal);

        cart.appliedGiftCard = {giftCard: giftCard._id as any, code: giftCard.code, amount};
        await cart.save();

        return {valid: true, data: cartToDTO(cart.toObject()), giftCardAmount: amount, balance: giftCard.balance};
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
        return {data: cartToDTO(cart.toObject())};
    }),
);

// Clear cart
router.delete(
    "/clear",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx} = params;

        await Cart.findOneAndUpdate(
            {company: company._id, user: actionUserCtx.userId},
            {$set: {items: [], subtotal: 0, discountTotal: 0, appliedDiscounts: []}},
        );
        return {message: "Cart cleared"};
    }),
);
