import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {
    notifyMerchantsNewOrder,
    notifyProductOrderCustomer,
} from "@eCommerceModule/utilities/services/productOrderNotify";
import Currency from "@coreModule/database/schemas/currency/currency";
import Checkout, {ICheckout} from "@eCommerceModule/database/schemas/checkout/checkout";
import {checkoutService} from "@eCommerceModule/database/schemas/checkout/checkout.service";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {generateOrderNumber} from "@eCommerceModule/utilities/services/orderNumberService";
import {calculateTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {calculateShipping} from "@eCommerceModule/utilities/services/shippingCalculationService";
import {
    consumeCheckoutReservations,
    OutOfStockError,
    reserveCheckoutStock,
} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {
    getAdapterForMethod,
    getPaymentAdapter,
    isOfflinePaymentMethod,
    paymentMethodToGateway,
} from "@eCommerceModule/utilities/services/payment/paymentService";
import {checkoutToDTO} from "@eCommerceModule/utilities/mappers/checkout/checkoutMapper.dto";
import {productOrderToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import {initCheckoutFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/initCheckout.form.validator";
import {checkoutAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkoutAddress.form.validator";
import {checkoutShippingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkoutShipping.form.validator";
import {checkoutPaymentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkoutPayment.form.validator";
import {confirmCheckoutFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/confirmCheckout.form.validator";

export const basePath = "/api/eCommerce/checkout";
export const router = Router();

/**
 * Currency for a checkout: the cart's currency, else the first line's product
 * currency, else the first configured platform currency.
 */
async function resolveCurrencyId(cart: any, companyId: ObjectId): Promise<ObjectId | null> {
    const cartCurrency = cart.currency?._id ?? cart.currency;
    if (cartCurrency) return cartCurrency;

    const firstProductId = cart.items?.[0]?.product?._id ?? cart.items?.[0]?.product;
    if (firstProductId) {
        const product = await Product.findOne({_id: firstProductId, company: companyId}, {currency: 1});
        const productCurrency = (product as any)?.currency?._id ?? (product as any)?.currency;
        if (productCurrency) return productCurrency;
    }

    const fallback = await Currency.findOne({}, {_id: 1}).sort({createdAt: 1});
    return fallback?._id ?? null;
}

// Initialize checkout from cart
router.post(
    "/init",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    validateFormZod(initCheckoutFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, idempotencyKey} = params;

        const existing = await checkoutService.findOne(
            {idempotencyKey, company: company._id, status: {$in: ["pending", "payment_processing"]}},
            {logger: params.logger, languageCode},
        );
        if (existing) return {data: checkoutToDTO(existing)};

        const cart = await Cart.findOne({user: actionUserCtx.userId, company: company._id});
        if (!cart || (cart.items as any[]).length === 0) {
            throw apiValidationException("cart_empty", null, null, languageCode);
        }

        const currencyId = await resolveCurrencyId(cart, company._id);
        if (!currencyId) throw apiValidationException("currency_not_configured", null, null, languageCode);

        const subtotal = cart.subtotal;
        const discountTotal = cart.discountTotal ?? 0;

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Carry over the cart's store credit if it is still redeemable
        let giftCard: {giftCard: any; code: string; amount: number} | undefined;
        if (cart.appliedGiftCard?.code) {
            const card = await giftCardService.findRedeemable(cart.appliedGiftCard.code, company._id, {languageCode});
            if (card) {
                giftCard = {
                    giftCard: card._id,
                    code: card.code,
                    amount: Math.min(card.balance, Math.max(0, subtotal - discountTotal)),
                };
            }
        }

        const checkout = new Checkout({
            cart: cart._id,
            company: company._id,
            user: actionUserCtx.userId,
            idempotencyKey,
            status: "pending",
            items: cart.items,
            currency: currencyId,
            subtotal,
            discountTotal,
            shippingTotal: 0,
            taxTotal: 0,
            grandTotal: Math.max(0, subtotal - discountTotal - (giftCard?.amount ?? 0)),
            appliedDiscounts: cart.appliedDiscounts ?? [],
            giftCard,
            expiresAt,
        });

        await checkout.save();
        return {data: checkoutToDTO(checkout.toObject())};
    }),
);

// Set shipping address + calculate rates
router.post(
    "/address",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(checkoutAddressFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, checkoutId, shippingAddress, billingAddress} = params;

        const checkout = await Checkout.findOne({_id: new ObjectId(checkoutId), company: company._id, user: actionUserCtx.userId, status: "pending"});
        if (!checkout) throw apiValidationException("checkout_not_found", null, null, languageCode);

        checkout.shippingAddress = shippingAddress;
        checkout.billingAddress = billingAddress ?? shippingAddress;

        const availableRates = await calculateShipping(
            {subtotal: checkout.subtotal, itemCount: (checkout.items as any[]).length, destinationCountry: shippingAddress?.country, destinationState: shippingAddress?.state},
            company._id,
        );
        // Normalize to the schema's rate shape ({name, carrier, price, estimatedDeliveryDays})
        checkout.availableShippingRates = (availableRates as any[]).map(rate => ({
            name: rate.rateName ?? rate.name ?? "",
            carrier: rate.zoneName ?? rate.carrier,
            price: rate.price ?? 0,
            estimatedDeliveryDays: rate.estimatedDays ?? rate.estimatedDeliveryDays,
        }));

        await checkout.save();
        return {data: checkoutToDTO(checkout.toObject())};
    }),
);

// Select shipping rate + recalculate totals
router.post(
    "/shipping",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(checkoutShippingFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, checkoutId, rateIndex} = params;

        const checkout = await Checkout.findOne({_id: new ObjectId(checkoutId), company: company._id, user: actionUserCtx.userId, status: "pending"});
        if (!checkout) throw apiValidationException("checkout_not_found", null, null, languageCode);

        const rates = (checkout.availableShippingRates as any[]) ?? [];
        const rate = rates[rateIndex];
        if (!rate) throw apiValidationException("invalid_rate_index", null, null, languageCode);

        checkout.selectedShippingRate = rate;
        checkout.shippingTotal = rate.price ?? 0;

        const taxTotal = await calculateTax(checkout.subtotal - checkout.discountTotal, checkout.shippingAddress as any ?? {}, company._id);
        checkout.taxTotal = taxTotal;
        const totalBeforeGiftCard = checkout.subtotal - checkout.discountTotal + checkout.shippingTotal + taxTotal;

        // Re-cap the store credit against the full order total (and live balance)
        if (checkout.giftCard?.code) {
            const card = await giftCardService.findRedeemable(checkout.giftCard.code, company._id, {languageCode: params.languageCode});
            const amount = card ? Math.min(card.balance, totalBeforeGiftCard) : 0;
            if (amount > 0 && card) {
                checkout.giftCard = {giftCard: card._id as any, code: card.code, amount};
            } else {
                checkout.giftCard = undefined;
            }
        }

        checkout.grandTotal = Math.max(0, totalBeforeGiftCard - (checkout.giftCard?.amount ?? 0));

        await checkout.save();
        return {data: checkoutToDTO(checkout.toObject())};
    }),
);

// Choose payment method — creates the gateway PaymentIntent for online methods
router.post(
    "/payment",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    validateFormZod(checkoutPaymentFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, checkoutId, paymentMethod} = params;

        const checkout = await Checkout.findOne({
            _id: new ObjectId(checkoutId),
            company: company._id,
            user: actionUserCtx.userId,
            status: {$in: ["pending", "payment_processing"]},
        });
        if (!checkout) throw apiValidationException("checkout_not_found", null, null, languageCode);
        if (!checkout.selectedShippingRate) throw apiValidationException("shipping_rate_required", null, null, languageCode);
        if (checkout.grandTotal <= 0) throw apiValidationException("invalid_amount", null, null, languageCode);

        checkout.paymentMethod = paymentMethod;

        if (isOfflinePaymentMethod(paymentMethod)) {
            await checkout.save();
            return {data: checkoutToDTO(checkout.toObject())};
        }

        const adapter = getAdapterForMethod(paymentMethod);
        if (!adapter || !adapter.isEnabled()) {
            throw apiValidationException("payment_method_not_available", null, null, languageCode);
        }

        // Re-entering /payment with an intent already created: return it as-is
        if (paymentMethod === "stripe" && checkout.stripePaymentIntentId && checkout.stripeClientSecret) {
            await checkout.save();
            return {data: checkoutToDTO(checkout.toObject())};
        }

        const currencyId = (checkout.currency as any)?._id ?? (checkout.currency as any);
        const currency = await Currency.findById(currencyId, {abbreviation: 1});
        if (!currency?.abbreviation) throw apiValidationException("currency_not_configured", null, null, languageCode);

        const intent = await adapter.createPaymentIntent({
            amount: checkout.grandTotal,
            currencyCode: currency.abbreviation,
            metadata: {
                checkoutId: checkout._id.toString(),
                companyId: company._id.toString(),
                idempotencyKey: checkout.idempotencyKey,
            },
            idempotencyKey: `checkout-pi-${checkout.idempotencyKey}`,
        });

        if (paymentMethod === "stripe") {
            checkout.stripePaymentIntentId = intent.id;
            checkout.stripeClientSecret = intent.clientSecret;
        }
        checkout.status = "payment_processing";
        await checkout.save();

        await paymentTransactionService.createPending(
            {
                sourceType: "checkout",
                sourceId: checkout._id as ObjectId,
                gateway: adapter.gateway,
                amount: checkout.grandTotal,
                currency: currencyId,
                gatewayTransactionId: intent.id,
                metadata: {idempotencyKey: checkout.idempotencyKey},
                company: company._id,
            },
            {logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {data: checkoutToDTO(checkout.toObject())};
    }),
);

/**
 * Confirm checkout — creates the ProductOrder and reserves inventory inside
 * one transaction. Online methods (stripe/PayPal) must have a succeeding
 * charge first; offline methods (cod/bank_transfer) create the order unpaid.
 */
router.post(
    "/confirm",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 5}),
    transactionHandler(),
    validateFormZod(confirmCheckoutFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, checkoutId, email, phone, notes} = params;

        const checkout = await Checkout.findOne({
            _id: new ObjectId(checkoutId),
            company: company._id,
            user: actionUserCtx.userId,
            status: {$in: ["pending", "payment_processing"]},
        }).session(session);
        if (!checkout) throw apiValidationException("checkout_not_found", null, null, languageCode);

        const fullyCoveredByGiftCard = (checkout.giftCard?.amount ?? 0) > 0 && checkout.grandTotal <= 0;

        if (!checkout.shippingAddress) throw apiValidationException("shipping_address_required", null, null, languageCode);
        if (!checkout.selectedShippingRate) throw apiValidationException("shipping_rate_required", null, null, languageCode);
        if (!checkout.paymentMethod && !fullyCoveredByGiftCard) throw apiValidationException("payment_method_required", null, null, languageCode);

        const existingOrder = await ProductOrder.findOne({idempotencyKey: checkout.idempotencyKey, company: company._id}).session(session);
        if (existingOrder) return {data: productOrderToDTO(existingOrder)};

        // Online payments must be settled before an order is created
        let paymentStatus: "unpaid" | "paid" = "unpaid";
        let chargeTransaction: any = null;
        if (fullyCoveredByGiftCard) {
            paymentStatus = "paid";
        } else if (!isOfflinePaymentMethod(checkout.paymentMethod!)) {
            const gateway = paymentMethodToGateway(checkout.paymentMethod);
            chargeTransaction = await paymentTransactionService.findOne(
                {
                    sourceType: "checkout",
                    sourceId: checkout._id,
                    gateway,
                    type: "charge",
                    company: company._id,
                },
                {logger, languageCode, session},
            );
            if (!chargeTransaction) throw apiValidationException("payment_not_initiated", null, null, languageCode);

            if (chargeTransaction.status !== "succeeded") {
                // Webhook may not have landed yet — ask the gateway directly once
                const adapter = getPaymentAdapter(gateway);
                if (adapter && chargeTransaction.gatewayTransactionId) {
                    const intent = await adapter.retrievePaymentIntent(chargeTransaction.gatewayTransactionId);
                    if (intent.status === "succeeded") {
                        await paymentTransactionService.markSucceeded(chargeTransaction.gatewayTransactionId, undefined, {logger, languageCode, session});
                        chargeTransaction.status = "succeeded";
                    }
                }
            }
            if (chargeTransaction.status !== "succeeded") {
                throw apiValidationException("payment_not_completed", null, null, languageCode);
            }
            paymentStatus = "paid";
        }

        // Reserve stock for every tracked line; rollback undoes partial holds
        let reservations;
        try {
            reservations = await reserveCheckoutStock(
                (checkout.items as any[]).map(item => ({
                    product: item.product?._id ?? item.product,
                    variant: item.variant?._id ?? item.variant ?? undefined,
                    quantity: item.quantity,
                })),
                company._id,
                {logger, languageCode, session, auditUserId: actionUserCtx.userId},
            );
        } catch (e) {
            if (e instanceof OutOfStockError) {
                throw apiValidationException("out_of_stock", null, null, languageCode);
            }
            throw e;
        }

        checkout.reservations = reservations;

        // Redeem store credit atomically — fails when the balance changed since apply
        if ((checkout.giftCard?.amount ?? 0) > 0) {
            const redeemed = await giftCardService.redeemAmount(
                (checkout.giftCard!.giftCard as any)?._id ?? (checkout.giftCard!.giftCard as any),
                checkout.giftCard!.amount,
                {logger, languageCode, session, auditUserId: actionUserCtx.userId},
            );
            if (!redeemed) {
                throw apiValidationException("gift_card_balance_changed", null, null, languageCode);
            }
        }

        const orderNumber = await generateOrderNumber(company._id);

        const items = (checkout.items as any[]).map(item => ({
            product: item.product?._id ?? item.product,
            variant: item.variant?._id ?? item.variant ?? undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            snapshot: {
                title: item.snapshot?.title ?? "",
                sku: item.snapshot?.sku ?? undefined,
                imageUrl: item.snapshot?.imageUrl ?? undefined,
            },
        }));

        const now = new Date();
        const order = new ProductOrder({
            company: company._id,
            orderNumber,
            status: paymentStatus === "paid" ? "confirmed" : "pending",
            paymentStatus,
            fulfillmentStatus: "unfulfilled",
            customer: actionUserCtx.userId,
            email,
            phone,
            items,
            currency: (checkout.currency as any)?._id ?? checkout.currency,
            shippingAddress: checkout.shippingAddress,
            billingAddress: checkout.billingAddress ?? checkout.shippingAddress,
            shippingRate: checkout.selectedShippingRate,
            appliedDiscounts: checkout.appliedDiscounts ?? [],
            taxBreakdown: checkout.taxBreakdown ?? [],
            subtotal: checkout.subtotal,
            discountTotal: checkout.discountTotal,
            shippingTotal: checkout.shippingTotal,
            taxTotal: checkout.taxTotal,
            grandTotal: checkout.grandTotal,
            giftCard: checkout.giftCard
                ? {
                      giftCard: (checkout.giftCard.giftCard as any)?._id ?? checkout.giftCard.giftCard,
                      code: checkout.giftCard.code,
                      amount: checkout.giftCard.amount,
                  }
                : undefined,
            stripePaymentIntentId: checkout.stripePaymentIntentId,
            idempotencyKey: checkout.idempotencyKey,
            notes: notes || undefined,
            timeline: [
                {event: "order_placed", timestamp: now, userId: actionUserCtx.userId},
                ...(paymentStatus === "paid" ? [{event: "payment_received", timestamp: now}] : []),
            ],
        });

        await order.save({session});

        if (chargeTransaction) {
            await paymentTransactionService.attachProductOrder(
                chargeTransaction._id,
                order._id as ObjectId,
                {logger, languageCode, session, checkoutId: checkout._id as ObjectId},
            );
        }

        // Fully gift-card-funded orders get a wallet ledger entry instead of a gateway charge
        if (fullyCoveredByGiftCard) {
            await paymentTransactionService.create(
                {
                    sourceType: "productOrder",
                    sourceId: order._id,
                    gateway: "wallet",
                    type: "charge",
                    status: "succeeded",
                    amount: checkout.giftCard!.amount,
                    currency: (checkout.currency as any)?._id ?? checkout.currency,
                    metadata: {
                        giftCardCode: checkout.giftCard!.code,
                        checkoutId: checkout._id.toString(),
                    },
                    company: company._id,
                } as any,
                {logger, languageCode, session, auditUserId: actionUserCtx.userId},
            );
        }

        checkout.status = "confirmed";
        await checkout.save({session});

        // Paid orders convert reservations to sales immediately
        if (paymentStatus === "paid") {
            await consumeCheckoutReservations(checkout as ICheckout, {logger, languageCode, session, auditUserId: actionUserCtx.userId});
            await fulfillOrderPaidExtras(order, {logger, languageCode, session, auditUserId: actionUserCtx.userId});
        }

        await Cart.findOneAndUpdate(
            {user: actionUserCtx.userId, company: company._id},
            {$set: {items: [], subtotal: 0, discountTotal: 0, appliedDiscounts: []}},
            {session},
        );

        const customerId = actionUserCtx.userId?.toString?.() ?? String(actionUserCtx.userId);
        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PLACED, {
            companyId: company._id,
            languageCode,
            order,
            customerId,
            orderEmail: email,
            extra: {grandTotal: order.grandTotal},
        });
        if (paymentStatus === "paid") {
            await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PAID, {
                companyId: company._id,
                languageCode,
                order,
                customerId,
                orderEmail: email,
                extra: {grandTotal: order.grandTotal},
            });
        }
        await notifyMerchantsNewOrder({
            companyId: company._id,
            languageCode,
            orderId: order._id.toString(),
            orderNumber,
            grandTotal: order.grandTotal,
        });

        return {data: productOrderToDTO(order)};
    }),
);
