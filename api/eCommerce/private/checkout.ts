import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Currency from "@coreModule/database/schemas/currency/currency";
import Checkout, {ICheckout} from "@eCommerceModule/database/schemas/checkout/checkout";
import Cart, {ICart} from "@eCommerceModule/database/schemas/cart/cart";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import Product from "@eCommerceModule/database/schemas/product/product";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import {calculateLinesTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {calculateShipping} from "@eCommerceModule/utilities/services/shippingCalculationService";
import {repriceCart} from "@eCommerceModule/utilities/services/cartPricingService";
import {roundMoney} from "@eCommerceModule/utilities/services/money";
import {
    assertDiscountUsable,
    placeOrderFromCheckout,
    reserveStockForPayment,
    resetCheckoutPayment,
} from "@eCommerceModule/utilities/services/checkoutPlacementService";
import {getAdapterForMethod, isOfflinePaymentMethod} from "@eCommerceModule/utilities/services/payment/paymentService";
import {checkoutToDTO} from "@eCommerceModule/utilities/mappers/checkout/checkoutMapper.dto";
import {productOrderToBuyerDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import {initCheckoutFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/initCheckout.form.validator";
import {checkoutAddressFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkoutAddress.form.validator";
import {checkoutShippingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkoutShipping.form.validator";
import {checkoutPaymentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkoutPayment.form.validator";
import {confirmCheckoutFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/confirmCheckout.form.validator";

export const basePath = "/api/eCommerce/checkout";
export const router = Router();

/** Product weights are converted to kilograms before shipping rates are matched. */
const KG_PER_UNIT: Record<string, number> = {kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125};

/** Product types that are physically delivered (unless the product says it needs no shipping). */
const SHIPPED_TYPES = new Set(["physical", "variable", "bundle"]);

/** How long a checkout (and the stock it holds) stays open without activity. */
const CHECKOUT_TTL_MS = 30 * 60 * 1000;

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

/** Order-relevant shape of a cart/checkout: lines, prices, discount and store credit. */
function contentFingerprint(lines: any[], subtotal: number, discountTotal: number, giftCardAmount: number): string {
    return JSON.stringify([
        lines.map(line => [
            String(line.product?._id ?? line.product),
            line.variant ? String(line.variant?._id ?? line.variant) : null,
            line.quantity,
            line.unitPrice,
        ]),
        subtotal,
        discountTotal,
        giftCardAmount,
    ]);
}

/** Copies the (freshly priced) cart onto a pending checkout and clears anything derived from it. */
function syncCheckoutFromCart(checkout: ICheckout, cart: ICart): void {
    checkout.items = (cart.items as any[]).map(item => ({
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        snapshot: item.snapshot,
    })) as any;
    checkout.subtotal = cart.subtotal;
    checkout.discountTotal = cart.discountTotal ?? 0;
    checkout.appliedDiscounts = (cart.appliedDiscounts ?? []) as any;
    checkout.giftCard = cart.appliedGiftCard?.code
        ? {giftCard: cart.appliedGiftCard.giftCard, code: cart.appliedGiftCard.code, amount: cart.appliedGiftCard.amount}
        : undefined;
    checkout.availableShippingRates = [];
    checkout.selectedShippingRate = undefined;
    checkout.shippingTotal = 0;
    checkout.taxTotal = 0;
    checkout.taxBreakdown = [];
    checkout.grandTotal = roundMoney(Math.max(0, checkout.subtotal - checkout.discountTotal - (checkout.giftCard?.amount ?? 0)));
}

/**
 * Recomputes grandTotal from the parts, re-capping store credit against the
 * order total and the card's live balance.
 */
async function recomputeTotals(checkout: ICheckout, companyId: ObjectId, languageCode: string, session?: any): Promise<void> {
    const totalBeforeGiftCard = roundMoney(
        Math.max(0, checkout.subtotal - checkout.discountTotal) + (checkout.shippingTotal ?? 0) + (checkout.taxTotal ?? 0),
    );

    if (checkout.giftCard?.code) {
        const card = await giftCardService.findRedeemable(checkout.giftCard.code, companyId, {languageCode, session});
        const amount = card ? roundMoney(Math.min(card.balance, totalBeforeGiftCard)) : 0;
        checkout.giftCard = amount > 0 && card ? {giftCard: card._id as any, code: card.code, amount} : undefined;
    }

    checkout.grandTotal = roundMoney(Math.max(0, totalBeforeGiftCard - (checkout.giftCard?.amount ?? 0)));
}

/** Loads the buyer's open checkout (pending or mid-payment). */
async function findOpenCheckout(params: any): Promise<ICheckout> {
    const {languageCode, company, actionUserCtx, checkoutId, session} = params;
    const checkout = await Checkout.findOne({
        _id: new ObjectId(checkoutId),
        company: company._id,
        user: actionUserCtx.userId,
        status: {$in: ["pending", "payment_processing"]},
    }).session(session ?? null);
    if (!checkout) throw apiValidationException("checkout_not_found", null, null, languageCode);
    return checkout;
}

function placementCtx(params: any) {
    const {logger, languageCode, session, actionUserCtx} = params;
    return {logger, languageCode, session, auditUserId: actionUserCtx.userId};
}

// Initialize (or resume) the checkout for the buyer's cart
router.post(
    "/init",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    validateFormZod(initCheckoutFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, idempotencyKey} = params;
        const userId = new ObjectId(actionUserCtx.userId);

        const existing = await Checkout.findOne({idempotencyKey});
        if (existing && (existing.company.toString() !== company._id.toString() || existing.user?.toString() !== userId.toString())) {
            throw apiValidationException("idempotency_key_conflict", null, null, languageCode);
        }
        // Mid-payment or already placed: resume as-is (redirect returns land here)
        if (existing && ["payment_processing", "confirmed"].includes(existing.status)) {
            const cart = await Cart.findOne({user: userId, company: company._id});
            const cartChanged = existing.status === "payment_processing" && cart && (cart.items as any[]).length > 0
                && contentFingerprint(cart.items as any[], cart.subtotal, cart.discountTotal ?? 0, cart.appliedGiftCard?.amount ?? 0)
                    !== contentFingerprint(existing.items as any[], existing.subtotal, existing.discountTotal, (existing.giftCard?.amount ?? 0));
            if (cartChanged) throw apiValidationException("checkout_cart_changed", null, null, languageCode);
            return {data: checkoutToDTO(existing.toObject() as ICheckout)};
        }
        if (existing && existing.status !== "pending") {
            throw apiValidationException("checkout_expired", null, null, languageCode);
        }

        const cart = await Cart.findOne({user: userId, company: company._id});
        if (!cart || (cart.items as any[]).length === 0) {
            throw apiValidationException("cart_empty", null, null, languageCode);
        }

        // Live prices + discount re-validation before anything is copied to the checkout
        await repriceCart(cart as any, {companyId: company._id, userId, languageCode});
        await cart.save();
        if ((cart.items as any[]).length === 0) throw apiValidationException("cart_empty", null, null, languageCode);

        if (existing) {
            const changed = contentFingerprint(cart.items as any[], cart.subtotal, cart.discountTotal ?? 0, cart.appliedGiftCard?.amount ?? 0)
                !== contentFingerprint(existing.items as any[], existing.subtotal, existing.discountTotal, existing.giftCard?.amount ?? 0);
            if (changed) {
                // An offline method may already hold stock for the old contents
                await resetCheckoutPayment(existing, {logger: params.logger, languageCode, auditUserId: actionUserCtx.userId});
                syncCheckoutFromCart(existing, cart);
                existing.expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);
                await existing.save();
            }
            return {data: checkoutToDTO(existing.toObject() as ICheckout)};
        }

        const currencyId = await resolveCurrencyId(cart, company._id);
        if (!currencyId) throw apiValidationException("currency_not_configured", null, null, languageCode);

        const checkout = new Checkout({
            cart: cart._id,
            company: company._id,
            user: userId,
            idempotencyKey,
            status: "pending",
            currency: currencyId,
            shippingTotal: 0,
            taxTotal: 0,
            expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
        });
        syncCheckoutFromCart(checkout, cart);

        await checkout.save();
        return {data: checkoutToDTO(checkout.toObject() as ICheckout)};
    }),
);

// Set shipping address + calculate rates (resets any chosen rate, tax and payment attempt)
router.post(
    "/address",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    transactionHandler(),
    validateFormZod(checkoutAddressFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, session, shippingAddress, billingAddress} = params;

        const checkout = await findOpenCheckout(params);
        await resetCheckoutPayment(checkout, placementCtx(params));

        checkout.shippingAddress = shippingAddress;
        checkout.billingAddress = billingAddress ?? shippingAddress;

        const productIds = (checkout.items as any[]).map(item => item.product?._id ?? item.product);
        const products = new Map(
            (await Product.find({_id: {$in: productIds}, company: company._id}, {weight: 1, weightUnit: 1, type: 1, requiresShipping: 1})
                .session(session).lean())
                .map((p: any) => [p._id.toString(), p]),
        );
        const productOf = (item: any) => products.get(String(item.product?._id ?? item.product));
        const totalQuantity = (checkout.items as any[]).reduce((sum, item) => sum + item.quantity, 0);
        const totalWeight = (checkout.items as any[]).reduce((sum, item) => {
            const product = productOf(item);
            return sum + Number(product?.weight ?? 0) * (KG_PER_UNIT[product?.weightUnit ?? "kg"] ?? 1) * item.quantity;
        }, 0);
        const needsShipping = (checkout.items as any[]).some(item => {
            const product = productOf(item);
            return !product || (SHIPPED_TYPES.has(product.type) && product.requiresShipping !== false);
        });

        // Gift cards, downloads and services travel by email: one free "rate" keeps the checkout steps the same
        const availableRates = needsShipping
            ? await calculateShipping(
                {
                    subtotal: checkout.subtotal,
                    itemCount: totalQuantity,
                    totalWeight,
                    destinationCountry: shippingAddress?.country,
                    destinationState: shippingAddress?.state,
                    destinationPostalCode: shippingAddress?.postalCode,
                },
                company._id,
            )
            : [{rateName: "No shipping required", price: 0}];
        // Normalize to the schema's rate shape ({name, carrier, price, estimatedDeliveryDays})
        checkout.availableShippingRates = (availableRates as any[]).map(rate => ({
            name: rate.rateName ?? rate.name ?? "",
            carrier: rate.zoneName ?? rate.carrier,
            price: roundMoney(rate.price ?? 0),
            estimatedDeliveryDays: rate.estimatedDays ?? rate.estimatedDeliveryDays,
        }));

        // A new address invalidates the previously chosen rate and the tax computed for it
        checkout.selectedShippingRate = undefined;
        checkout.shippingTotal = 0;
        checkout.taxTotal = 0;
        checkout.taxBreakdown = [];
        await recomputeTotals(checkout, company._id, languageCode, session);

        await checkout.save({session});
        return {data: checkoutToDTO(checkout.toObject() as ICheckout)};
    }),
);

// Select shipping rate + recalculate totals
router.post(
    "/shipping",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    transactionHandler(),
    validateFormZod(checkoutShippingFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, session, rateIndex} = params;

        const checkout = await findOpenCheckout(params);
        if (!checkout.shippingAddress) throw apiValidationException("shipping_address_required", null, null, languageCode);
        await resetCheckoutPayment(checkout, placementCtx(params));

        const rates = (checkout.availableShippingRates as any[]) ?? [];
        const rate = Number.isInteger(rateIndex) ? rates[rateIndex] : undefined;
        if (!rate) throw apiValidationException("invalid_rate_index", null, null, languageCode);

        const appliedDiscountId = checkout.appliedDiscounts?.[0]?.discount;
        const freeShipping = appliedDiscountId
            ? Boolean(await Discount.exists({_id: appliedDiscountId, company: company._id, type: "free_shipping", deletedAt: null}).session(session))
            : false;

        checkout.selectedShippingRate = rate;
        checkout.shippingTotal = freeShipping ? 0 : roundMoney(rate.price ?? 0);
        const tax = await calculateLinesTax(
            checkout.items as any[],
            checkout.discountTotal,
            checkout.shippingAddress as any ?? {},
            company._id,
        );
        checkout.taxTotal = tax.amount;
        checkout.taxBreakdown = tax.breakdown;
        await recomputeTotals(checkout, company._id, languageCode, session);

        await checkout.save({session});
        return {data: checkoutToDTO(checkout.toObject() as ICheckout)};
    }),
);

/**
 * Choose payment method. Stock is reserved here — before any charge — so a
 * paid order can never be out of stock. Online methods then get a gateway
 * PaymentIntent; switching methods resets the previous attempt first.
 */
router.post(
    "/payment",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    transactionHandler(),
    validateFormZod(checkoutPaymentFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, paymentMethod} = params;
        const ctx = placementCtx(params);

        const checkout = await findOpenCheckout(params);
        if (!checkout.selectedShippingRate) throw apiValidationException("shipping_rate_required", null, null, languageCode);
        if (checkout.grandTotal <= 0) throw apiValidationException("invalid_amount", null, null, languageCode);

        // Re-entering with the same online method and a live intent: return it as-is
        if (paymentMethod === "stripe" && checkout.paymentMethod === "stripe" && checkout.stripePaymentIntentId && checkout.stripeClientSecret) {
            return {data: checkoutToDTO(checkout.toObject() as ICheckout)};
        }
        if (checkout.paymentMethod && checkout.paymentMethod !== paymentMethod) {
            await resetCheckoutPayment(checkout, ctx);
        }

        let adapter = null;
        if (!isOfflinePaymentMethod(paymentMethod)) {
            adapter = getAdapterForMethod(paymentMethod);
            if (!adapter || !adapter.isEnabled()) {
                throw apiValidationException("payment_method_not_available", null, null, languageCode);
            }
        }

        await assertDiscountUsable(checkout, ctx);
        await reserveStockForPayment(checkout, ctx);
        checkout.paymentMethod = paymentMethod;
        checkout.expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);

        if (!adapter) {
            await checkout.save({session});
            return {data: checkoutToDTO(checkout.toObject() as ICheckout)};
        }

        const currencyId = (checkout.currency as any)?._id ?? (checkout.currency as any);
        const currency = await Currency.findById(currencyId, {abbreviation: 1}).session(session);
        if (!currency?.abbreviation) throw apiValidationException("currency_not_configured", null, null, languageCode);

        const intent = await adapter.createPaymentIntent({
            amount: checkout.grandTotal,
            currencyCode: currency.abbreviation,
            metadata: {
                checkoutId: checkout._id.toString(),
                companyId: company._id.toString(),
                idempotencyKey: checkout.idempotencyKey,
            },
            idempotencyKey: `checkout-pi-${checkout.idempotencyKey}-${checkout.paymentAttempt ?? 0}`,
        });

        if (paymentMethod === "stripe") {
            checkout.stripePaymentIntentId = intent.id;
            checkout.stripeClientSecret = intent.clientSecret;
        }
        checkout.status = "payment_processing";
        await checkout.save({session});

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
            {logger, languageCode, session, auditUserId: actionUserCtx.userId},
        );

        return {data: checkoutToDTO(checkout.toObject() as ICheckout)};
    }),
);

/**
 * Confirm checkout — creates the ProductOrder. Online methods must have a
 * succeeded charge; offline methods (cod/bank_transfer) create the order
 * unpaid with stock still reserved. Idempotent: if the payment webhook already
 * placed the order, it is returned.
 */
router.post(
    "/confirm",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 5}),
    transactionHandler(),
    validateFormZod(confirmCheckoutFormSchema),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, session, checkoutId, email, phone, notes} = params;

        const checkout = await Checkout.findOne({
            _id: new ObjectId(checkoutId),
            company: company._id,
            user: actionUserCtx.userId,
            status: {$in: ["pending", "payment_processing", "confirmed"]},
        }).session(session);
        if (!checkout) throw apiValidationException("checkout_not_found", null, null, languageCode);

        const {order} = await placeOrderFromCheckout(checkout, {email, phone, notes}, placementCtx(params));
        return {data: productOrderToBuyerDTO(order)};
    }),
);
