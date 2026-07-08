import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import {checkoutService} from "@eCommerceModule/database/schemas/checkout/checkout.service";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import PaymentTransaction from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";
import {generateOrderNumber} from "@eCommerceModule/utilities/services/orderNumberService";
import {calculateTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {calculateShipping} from "@eCommerceModule/utilities/services/shippingCalculationService";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {productOrderToDTO} from "@eCommerceModule/utilities/mappers/productOrderMapper.dto";

export const basePath = "/api/eCommerce/checkout";
export const router = Router();

function checkoutToDTO(checkout: any) {
    return {
        _id: checkout._id.toString(),
        status: checkout.status,
        items: checkout.items ?? [],
        shippingAddress: checkout.shippingAddress,
        billingAddress: checkout.billingAddress,
        availableShippingRates: checkout.availableShippingRates ?? [],
        selectedShippingRate: checkout.selectedShippingRate,
        subtotal: checkout.subtotal,
        discountTotal: checkout.discountTotal,
        shippingTotal: checkout.shippingTotal,
        taxTotal: checkout.taxTotal,
        grandTotal: checkout.grandTotal,
        stripeClientSecret: checkout.stripeClientSecret,
        expiresAt: checkout.expiresAt?.toISOString(),
    };
}

// Initialize checkout from cart
router.post(
    "/init",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {idempotencyKey} = req.body;

        if (!idempotencyKey) return res.status(400).json({message: "idempotencyKey required"});

        const existing = await Checkout.findOne({idempotencyKey, company: company._id, status: "pending"});
        if (existing) return res.json({data: checkoutToDTO(existing)});

        const cart = await Cart.findOne({user: actionUserCtx.userId, company: company._id});
        if (!cart || (cart.items as any[]).length === 0) {
            return res.status(400).json({message: "cart_empty"});
        }

        const subtotal = cart.subtotal;
        const discountTotal = cart.discountTotal ?? 0;

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        const checkout = new Checkout({
            company: company._id,
            user: actionUserCtx.userId,
            idempotencyKey,
            status: "pending",
            items: cart.items,
            subtotal,
            discountTotal,
            shippingTotal: 0,
            taxTotal: 0,
            grandTotal: subtotal - discountTotal,
            appliedDiscounts: cart.appliedDiscounts ?? [],
            expiresAt,
        });

        await checkout.save();
        return res.json({data: checkoutToDTO(checkout.toObject())});
    }),
);

// Set shipping address + calculate rates
router.post(
    "/address",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    asyncHandler(async (req: any, res: any) => {
        const {company, actionUserCtx} = req;
        const {checkoutId, shippingAddress, billingAddress} = req.body;

        if (!checkoutId) return res.status(400).json({message: "checkoutId required"});

        const checkout = await Checkout.findOne({_id: new ObjectId(checkoutId), company: company._id, user: actionUserCtx.userId, status: "pending"});
        if (!checkout) return res.status(404).json({message: "checkout_not_found"});

        checkout.shippingAddress = shippingAddress;
        checkout.billingAddress = billingAddress ?? shippingAddress;

        const availableRates = await calculateShipping(
            {subtotal: checkout.subtotal, itemCount: (checkout.items as any[]).length, destinationCountry: shippingAddress?.country, destinationState: shippingAddress?.state},
            company._id,
        );
        checkout.availableShippingRates = availableRates as any[];

        await checkout.save();
        return res.json({data: checkoutToDTO(checkout.toObject())});
    }),
);

// Select shipping rate + recalculate totals
router.post(
    "/shipping",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    asyncHandler(async (req: any, res: any) => {
        const {company, actionUserCtx} = req;
        const {checkoutId, rateIndex} = req.body;

        const checkout = await Checkout.findOne({_id: new ObjectId(checkoutId), company: company._id, user: actionUserCtx.userId, status: "pending"});
        if (!checkout) return res.status(404).json({message: "checkout_not_found"});

        const rates = (checkout.availableShippingRates as any[]) ?? [];
        const rate = rates[rateIndex];
        if (!rate) return res.status(400).json({message: "invalid_rate_index"});

        checkout.selectedShippingRate = rate;
        checkout.shippingTotal = rate.price ?? 0;

        const taxTotal = await calculateTax(checkout.subtotal - checkout.discountTotal, checkout.shippingAddress as any ?? {}, company._id);
        checkout.taxTotal = taxTotal;
        checkout.grandTotal = checkout.subtotal - checkout.discountTotal + checkout.shippingTotal + taxTotal;

        await checkout.save();
        return res.json({data: checkoutToDTO(checkout.toObject())});
    }),
);

// Confirm checkout — create order + reserve inventory
router.post(
    "/confirm",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 5}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx, session} = req;
        const {checkoutId, email, phone, notes} = req.body;

        if (!checkoutId) return res.status(400).json({message: "checkoutId required"});

        const checkout = await Checkout.findOne({_id: new ObjectId(checkoutId), company: company._id, user: actionUserCtx.userId, status: "pending"});
        if (!checkout) return res.status(404).json({message: "checkout_not_found"});

        if (!checkout.shippingAddress) return res.status(400).json({message: "shipping_address_required"});
        if (!checkout.selectedShippingRate) return res.status(400).json({message: "shipping_rate_required"});

        const existingOrder = await ProductOrder.findOne({idempotencyKey: checkout.idempotencyKey, company: company._id});
        if (existingOrder) return res.json({data: productOrderToDTO(existingOrder)});

        const orderNumber = await generateOrderNumber(company._id);

        const items = (checkout.items as any[]).map(item => ({
            product: item.product?._id ?? item.product,
            variant: item.variant?._id ?? item.variant ?? undefined,
            title: item.snapshot?.title ?? "",
            sku: item.snapshot?.sku ?? undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            discount: 0,
        }));

        const order = new ProductOrder({
            company: company._id,
            orderNumber,
            status: "pending",
            paymentStatus: "pending",
            fulfillmentStatus: "unfulfilled",
            customer: actionUserCtx.userId,
            email,
            phone,
            items,
            shippingAddress: checkout.shippingAddress,
            billingAddress: checkout.billingAddress ?? checkout.shippingAddress,
            subtotal: checkout.subtotal,
            discountTotal: checkout.discountTotal,
            shippingTotal: checkout.shippingTotal,
            taxTotal: checkout.taxTotal,
            grandTotal: checkout.grandTotal,
            idempotencyKey: checkout.idempotencyKey,
            notes: notes || undefined,
        });

        await order.save();

        checkout.status = "completed";
        await checkout.save();

        await Cart.findOneAndUpdate(
            {user: actionUserCtx.userId, company: company._id},
            {$set: {items: [], subtotal: 0, discountTotal: 0, appliedDiscounts: []}},
        );

        return res.json({data: productOrderToDTO(order)});
    }),
);
