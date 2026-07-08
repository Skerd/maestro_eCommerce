import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import {cartService} from "@eCommerceModule/database/schemas/cart/cart.service";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {validateDiscount} from "@eCommerceModule/utilities/services/discountValidationService";
import {
    calculatePricing,
    enrichCartLinesWithProductMeta,
    getCustomerGroupIdsForUser,
} from "@eCommerceModule/utilities/services/pricingCalculationService";

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

function cartToDTO(cart: any) {
    return {
        _id: cart._id.toString(),
        items: (cart.items ?? []).map((item: any) => ({
            _id: item._id?.toString(),
            product: {_id: item.product?._id?.toString() ?? item.product?.toString(), title: item.snapshot?.title},
            variant: item.variant ? {_id: item.variant._id?.toString() ?? item.variant.toString(), title: item.snapshot?.variantTitle} : null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            snapshot: item.snapshot,
        })),
        subtotal: cart.subtotal,
        discountTotal: cart.discountTotal,
        appliedDiscounts: cart.appliedDiscounts ?? [],
        expiresAt: cart.expiresAt?.toISOString(),
        guestToken: cart.guestToken,
    };
}

async function getOrCreateCart(req: any): Promise<any> {
    const {logger, languageCode, company, actionUserCtx} = req;
    const guestToken = req.headers["x-guest-token"] as string | undefined;

    let filter: Record<string, unknown> = {company: company._id, deletedAt: null};
    if (actionUserCtx?.userId) {
        filter.user = actionUserCtx.userId;
    } else if (guestToken) {
        filter.guestToken = guestToken;
    } else {
        return null;
    }

    const cart = await Cart.findOne(filter).populate("items.product", "title price mainImage").lean();
    return cart;
}

// GET cart
router.get(
    "/",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (req: any, res: any) => {
        const cart = await getOrCreateCart(req);
        if (!cart) return res.json({data: null});
        return res.json({data: cartToDTO(cart)});
    }),
);

// PUT item into cart
router.put(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {productId, variantId, quantity} = req.body;

        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({message: "productId and quantity required"});
        }

        const product = await Product.findOne({_id: new ObjectId(productId), company: company._id, status: "active"}).lean();
        if (!product) return res.status(404).json({message: "product_not_found"});

        let unitPrice = (product as any).price ?? 0;
        let variantDoc: any = null;

        if (variantId) {
            variantDoc = await ProductVariant.findOne({_id: new ObjectId(variantId), product: product._id}).lean();
            if (!variantDoc) return res.status(404).json({message: "variant_not_found"});
            unitPrice = variantDoc.price ?? unitPrice;
        }

        const guestToken = req.headers["x-guest-token"] as string | undefined;
        const filter: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.userId) filter.user = actionUserCtx.userId;
        else if (guestToken) filter.guestToken = guestToken;
        else return res.status(401).json({message: "authentication_required"});

        let cart = await Cart.findOne(filter);

        const snapshot = {
            title: (product as any).title,
            sku: variantDoc?.sku ?? (product as any).sku,
            variantTitle: variantDoc?.title,
            image: (product as any).mainImage?.toString(),
            price: unitPrice,
        };

        if (!cart) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (actionUserCtx?.userId ? 30 : 7));

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
                item.quantity += quantity;
                item.totalPrice = item.unitPrice * item.quantity;
            } else {
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

        await applyPricingToCart(cart, company._id, actionUserCtx?.userId ? new ObjectId(actionUserCtx.userId) : undefined);
        await cart.save();
        return res.json({data: cartToDTO(cart.toObject())});
    }),
);

// PATCH item quantity
router.patch(
    "/item",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (req: any, res: any) => {
        const {company, actionUserCtx} = req;
        const {itemId, quantity} = req.body;

        if (!itemId) return res.status(400).json({message: "itemId required"});

        const filter: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.userId) filter.user = actionUserCtx.userId;
        else {
            const guestToken = req.headers["x-guest-token"] as string | undefined;
            if (guestToken) filter.guestToken = guestToken;
            else return res.status(401).json({message: "authentication_required"});
        }

        const cart = await Cart.findOne(filter);
        if (!cart) return res.status(404).json({message: "cart_not_found"});

        const item = (cart.items as any[]).find((i: any) => i._id?.toString() === itemId);
        if (!item) return res.status(404).json({message: "item_not_found"});

        if (quantity <= 0) {
            cart.items = (cart.items as any[]).filter((i: any) => i._id?.toString() !== itemId) as any;
        } else {
            item.quantity = quantity;
            item.totalPrice = item.unitPrice * quantity;
        }

        cart.subtotal = (cart.items as any[]).reduce((s: number, i: any) => s + i.totalPrice, 0);
        await applyPricingToCart(cart, company._id, actionUserCtx?.userId ? new ObjectId(actionUserCtx.userId) : undefined);
        await cart.save();
        return res.json({data: cartToDTO(cart.toObject())});
    }),
);

// DELETE item
router.delete(
    "/item/:itemId",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (req: any, res: any) => {
        const {company, actionUserCtx} = req;
        const {itemId} = req.params;

        const filter: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.userId) filter.user = actionUserCtx.userId;
        else {
            const guestToken = req.headers["x-guest-token"] as string | undefined;
            if (guestToken) filter.guestToken = guestToken;
            else return res.status(401).json({message: "authentication_required"});
        }

        const cart = await Cart.findOneAndUpdate(
            filter,
            {$pull: {items: {_id: new ObjectId(itemId)}}},
            {new: true},
        );
        if (!cart) return res.status(404).json({message: "cart_not_found"});

        cart.subtotal = (cart.items as any[]).reduce((s: number, i: any) => s + i.totalPrice, 0);
        await applyPricingToCart(cart, company._id, actionUserCtx?.userId ? new ObjectId(actionUserCtx.userId) : undefined);
        await cart.save();
        return res.json({data: cartToDTO(cart.toObject())});
    }),
);

// Apply discount code
router.post(
    "/apply-discount",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {code} = req.body;

        if (!code) return res.status(400).json({message: "code required"});

        const filter: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.userId) filter.user = actionUserCtx.userId;
        else return res.status(401).json({message: "authentication_required"});

        const cart = await Cart.findOne(filter);
        if (!cart) return res.status(404).json({message: "cart_not_found"});

        const now = new Date();
        const discount = await Discount.findOne({
            company: company._id,
            code: code.trim().toUpperCase(),
            isActive: true,
            startsAt: {$lte: now},
            $or: [{endsAt: null}, {endsAt: {$gte: now}}],
        });

        if (!discount) return res.status(404).json({valid: false, message: "discount_not_found"});

        const result = validateDiscount({subtotal: cart.subtotal, items: []}, discount);
        if (!result.valid) return res.json({valid: false, message: result.reason});

        cart.discountTotal = result.discountAmount;
        cart.appliedDiscounts = [{discount: discount._id, code: discount.code, amount: result.discountAmount}] as any;
        await cart.save();

        return res.json({valid: true, data: cartToDTO(cart.toObject()), discountAmount: result.discountAmount});
    }),
);

// Clear cart
router.delete(
    "/clear",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (req: any, res: any) => {
        const {company, actionUserCtx} = req;
        const filter: Record<string, unknown> = {company: company._id};
        if (actionUserCtx?.userId) filter.user = actionUserCtx.userId;
        else return res.status(401).json({message: "authentication_required"});

        await Cart.findOneAndUpdate(filter, {$set: {items: [], subtotal: 0, discountTotal: 0, appliedDiscounts: []}});
        return res.json({message: "Cart cleared"});
    }),
);
