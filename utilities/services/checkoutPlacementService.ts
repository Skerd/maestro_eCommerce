import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {mongooseInstance} from "@coreModule/connections/connectToMongoDb";
import {flushAfterCommitTasks} from "@coreModule/utilities/middlewares/transactionUtils";
import Currency from "@coreModule/database/schemas/currency/currency";
import User from "@coreModule/database/schemas/user/user";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import Checkout, {ICheckout} from "@eCommerceModule/database/schemas/checkout/checkout";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {variantOptionsLabel} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import ProductOrder, {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import {countCustomerDiscountUses} from "@eCommerceModule/utilities/services/discountValidationService";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {generateOrderNumber} from "@eCommerceModule/utilities/services/orderNumberService";
import {
    OutOfStockError,
    releaseReservations,
    reserveCheckoutStock,
} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {
    getPaymentAdapter,
    isOfflinePaymentMethod,
    paymentMethodToGateway,
} from "@eCommerceModule/utilities/services/payment/paymentService";
import {
    notifyMerchantsNewOrder,
    notifyProductOrderCustomer,
} from "@eCommerceModule/utilities/services/productOrderNotify";

export type PlacementCtx = {
    logger: any;
    languageCode: string;
    session?: ClientSession;
    auditUserId?: ObjectId | string;
};

export type PlacementContact = {email?: string; phone?: string; notes?: string};

function idOf(value: unknown): ObjectId {
    const raw = (value as any)?._id ?? value;
    return raw instanceof ObjectId ? raw : new ObjectId(String(raw));
}

function hasHeldStock(checkout: ICheckout): boolean {
    return (checkout.reservations ?? []).some(r => r.state === "reserved" || r.state === "consumed");
}

/**
 * Catalog facts frozen onto the order lines at placement: the product type
 * (decides what payment issues) and the chosen option values of the variant.
 */
async function lineSnapshotFacts(checkout: ICheckout, ctx: PlacementCtx) {
    const companyId = idOf(checkout.company);
    const lines = checkout.items as any[];
    const variantIds = lines.flatMap(item => (item.variant ? [idOf(item.variant)] : []));
    const [products, variants] = await Promise.all([
        Product.find({_id: {$in: lines.map(item => idOf(item.product))}, company: companyId}, {type: 1})
            .session(ctx.session ?? null).lean(),
        ProductVariant.find({_id: {$in: variantIds}, company: companyId}, {attributeCombination: 1})
            .session(ctx.session ?? null).lean(),
    ]);
    return {
        productTypes: new Map(products.map(product => [product._id.toString(), product.type])),
        variantLabels: new Map(variants.map(variant => [variant._id.toString(), variantOptionsLabel(variant)])),
    };
}

function checkoutLines(checkout: ICheckout) {
    return (checkout.items as any[]).map(item => ({
        product: idOf(item.product),
        variant: item.variant ? idOf(item.variant) : undefined,
        quantity: item.quantity,
    }));
}

/**
 * Holds stock for every tracked line before any charge is attempted. Throws
 * `out_of_stock` (nothing held) when a line can't be covered.
 */
export async function reserveStockForPayment(checkout: ICheckout, ctx: PlacementCtx): Promise<void> {
    if (hasHeldStock(checkout)) return;
    try {
        checkout.reservations = await reserveCheckoutStock(checkoutLines(checkout), idOf(checkout.company), ctx);
    } catch (e) {
        if (e instanceof OutOfStockError) {
            throw apiValidationException("out_of_stock", null, null, ctx.languageCode);
        }
        throw e;
    }
    checkout.markModified("reservations");
}

/**
 * Returns a checkout that already entered the payment step to plain `pending`
 * so the buyer can change address / shipping / method: cancels the open
 * gateway intent (refusing when it was already paid), marks its pending
 * transaction failed, releases held stock and bumps `paymentAttempt` so the
 * next intent gets a fresh gateway idempotency key. No-op for untouched checkouts.
 */
export async function resetCheckoutPayment(checkout: ICheckout, ctx: PlacementCtx): Promise<void> {
    const intentId = checkout.stripePaymentIntentId;
    if (intentId) {
        const adapter = getPaymentAdapter("stripe");
        if (adapter?.isEnabled()) {
            const intent = await adapter.cancelPaymentIntent(intentId);
            if (intent.status === "succeeded") {
                throw apiValidationException("payment_already_completed", null, null, ctx.languageCode);
            }
        }
        await paymentTransactionService.markFailed(intentId, "cancelled_by_buyer", undefined, ctx);
    }

    if ((checkout.reservations ?? []).some(r => r.state === "reserved")) {
        await releaseReservations(checkout, ctx);
    }

    checkout.reservations = [];
    checkout.stripePaymentIntentId = undefined;
    checkout.stripeClientSecret = undefined;
    checkout.paymentMethod = undefined;
    checkout.paymentAttempt = (checkout.paymentAttempt ?? 0) + (intentId ? 1 : 0);
    checkout.status = "pending";
}

/** Gateway minor-unit amount + currency the checkout must be charged with. */
async function expectedCharge(checkout: ICheckout, gateway: "stripe" | "paypal") {
    const adapter = getPaymentAdapter(gateway);
    const currency = await Currency.findById(idOf(checkout.currency), {abbreviation: 1});
    const code = currency?.abbreviation?.toLowerCase();
    if (!adapter || !code) return null;
    return {amountMinor: adapter.toMinorUnits(checkout.grandTotal, code), currencyCode: code};
}

/**
 * Throws `payment_amount_mismatch` when a succeeded intent doesn't match the
 * checkout total (defense against tampered or stale intents). Silent when the
 * gateway didn't report an amount.
 */
export async function assertIntentMatchesCheckout(
    checkout: ICheckout,
    intent: {amountMinor?: number; currencyCode?: string},
    ctx: PlacementCtx,
): Promise<void> {
    if (intent.amountMinor == null) return;
    const expected = await expectedCharge(checkout, "stripe");
    if (!expected) return;
    if (intent.amountMinor !== expected.amountMinor || (intent.currencyCode ?? expected.currencyCode).toLowerCase() !== expected.currencyCode) {
        ctx.logger?.err?.(
            `Payment amount mismatch on checkout ${checkout._id}: intent ${intent.amountMinor} ${intent.currencyCode}, expected ${expected.amountMinor} ${expected.currencyCode}`,
        );
        throw apiValidationException("payment_amount_mismatch", null, null, ctx.languageCode);
    }
}

/** Resolves whether the checkout is paid; settles a late webhook by asking the gateway once. */
async function resolvePayment(checkout: ICheckout, ctx: PlacementCtx) {
    const fullyCoveredByGiftCard = (checkout.giftCard?.amount ?? 0) > 0 && checkout.grandTotal <= 0;
    if (fullyCoveredByGiftCard) return {paid: true, fullyCoveredByGiftCard, charge: null};
    if (isOfflinePaymentMethod(checkout.paymentMethod!)) return {paid: false, fullyCoveredByGiftCard, charge: null};

    const gateway = paymentMethodToGateway(checkout.paymentMethod!);
    const charge = await PaymentTransaction.findOne({
        sourceType: "checkout",
        sourceId: checkout._id,
        type: "charge",
        company: idOf(checkout.company),
        ...(checkout.stripePaymentIntentId ? {gatewayTransactionId: checkout.stripePaymentIntentId} : {gateway}),
    }).sort({createdAt: -1}).session(ctx.session ?? null);
    if (!charge) throw apiValidationException("payment_not_initiated", null, null, ctx.languageCode);

    if (charge.status !== "succeeded") {
        const adapter = getPaymentAdapter(gateway);
        if (adapter?.isEnabled() && charge.gatewayTransactionId) {
            const intent = await adapter.retrievePaymentIntent(charge.gatewayTransactionId);
            if (intent.status === "succeeded") {
                await assertIntentMatchesCheckout(checkout, intent, ctx);
                await paymentTransactionService.markSucceeded(charge.gatewayTransactionId, undefined, ctx);
                charge.status = "succeeded";
            }
        }
    }
    if (charge.status !== "succeeded") {
        throw apiValidationException("payment_not_completed", null, null, ctx.languageCode);
    }
    return {paid: true, fullyCoveredByGiftCard, charge};
}

/**
 * Pre-charge check at the payment step: the applied code must still be active,
 * in its date window, under its global limit and under the buyer's limit.
 * Nothing is counted here — placement counts the use atomically.
 */
export async function assertDiscountUsable(checkout: ICheckout, ctx: PlacementCtx): Promise<void> {
    const applied = checkout.appliedDiscounts?.[0];
    if (!applied?.discount) return;

    const discountId = idOf(applied.discount);
    const companyId = idOf(checkout.company);
    const now = new Date();
    const discount = await Discount.findOne({
        _id: discountId,
        company: companyId,
        deletedAt: null,
        isActive: true,
        startsAt: {$lte: now},
        $and: [
            {$or: [{endsAt: null}, {endsAt: {$gte: now}}]},
            {$or: [{usageLimit: null}, {$expr: {$lt: ["$usageCount", "$usageLimit"]}}]},
        ],
    }).session(ctx.session ?? null);
    if (!discount) throw apiValidationException("discount_no_longer_valid", null, null, ctx.languageCode);

    if (discount.usageLimitPerCustomer && checkout.user) {
        const used = await countCustomerDiscountUses(discountId, idOf(checkout.user), companyId, ctx.session);
        if (used >= discount.usageLimitPerCustomer) {
            throw apiValidationException("discount_customer_limit_reached", null, null, ctx.languageCode);
        }
    }
}

/**
 * Counts one use of the applied discount. Orders without captured gateway money
 * are refused when the code stopped qualifying; charged orders honour the code
 * that was valid when the buyer paid (refusing would strand the money) but
 * still count the use.
 */
async function consumeDiscount(checkout: ICheckout, moneyCaptured: boolean, ctx: PlacementCtx): Promise<void> {
    const applied = checkout.appliedDiscounts?.[0];
    if (!applied?.discount) return;

    const discountId = idOf(applied.discount);
    const companyId = idOf(checkout.company);
    const now = new Date();

    const counted = await Discount.findOneAndUpdate(
        {
            _id: discountId,
            company: companyId,
            deletedAt: null,
            isActive: true,
            startsAt: {$lte: now},
            $and: [
                {$or: [{endsAt: null}, {endsAt: {$gte: now}}]},
                {$or: [{usageLimit: null}, {$expr: {$lt: ["$usageCount", "$usageLimit"]}}]},
            ],
        },
        {$inc: {usageCount: 1}},
        {new: true, session: ctx.session},
    );

    let reason: string | null = counted ? null : "discount_no_longer_valid";
    if (counted?.usageLimitPerCustomer && checkout.user) {
        const used = await countCustomerDiscountUses(discountId, idOf(checkout.user), companyId, ctx.session);
        if (used >= counted.usageLimitPerCustomer) reason = "discount_customer_limit_reached";
    }

    if (reason && !moneyCaptured) throw apiValidationException(reason, null, null, ctx.languageCode);
    if (reason) {
        ctx.logger?.warn?.(`Checkout ${checkout._id}: honouring discount ${applied.code} on a paid order despite ${reason}`);
        if (!counted) await Discount.updateOne({_id: discountId}, {$inc: {usageCount: 1}}, {session: ctx.session});
    }
}

/**
 * Turns a checkout into a ProductOrder. Single implementation behind
 * /checkout/confirm, the payment webhook and the expiry-job recovery, so a
 * paid checkout becomes an order no matter which path sees the payment first.
 * Idempotent per checkout (order idempotencyKey) — the second caller gets the
 * existing order back with `created: false`.
 */
export async function placeOrderFromCheckout(
    checkout: ICheckout,
    contact: PlacementContact,
    ctx: PlacementCtx,
): Promise<{order: IProductOrder; created: boolean}> {
    const companyId = idOf(checkout.company);
    const customerId = checkout.user ? idOf(checkout.user) : undefined;

    const existingOrder = await ProductOrder.findOne({idempotencyKey: checkout.idempotencyKey, company: companyId}).session(ctx.session ?? null);
    if (existingOrder) return {order: existingOrder, created: false};

    const {paid, fullyCoveredByGiftCard, charge} = await resolvePayment(checkout, ctx);
    if (!checkout.shippingAddress) throw apiValidationException("shipping_address_required", null, null, ctx.languageCode);
    if (!checkout.selectedShippingRate) throw apiValidationException("shipping_rate_required", null, null, ctx.languageCode);
    if (!checkout.paymentMethod && !fullyCoveredByGiftCard) throw apiValidationException("payment_method_required", null, null, ctx.languageCode);

    // Gateway money already captured: never refuse the order, record shortfalls instead
    const moneyCaptured = Boolean(charge);
    const shortfalls: {event: string; note?: string}[] = [];

    await consumeDiscount(checkout, moneyCaptured, ctx);

    // Stock is normally held since the payment step; re-hold if expiry released it
    if (!hasHeldStock(checkout)) {
        try {
            await reserveStockForPayment(checkout, ctx);
        } catch (e: any) {
            if (!moneyCaptured) throw e;
            // Money is captured: keep the order and let staff refund or backorder
            shortfalls.push({event: "stock_shortfall", note: "Stock unavailable when the paid order was placed"});
            ctx.logger?.err?.(`Checkout ${checkout._id}: paid but out of stock at placement`);
        }
    }

    if ((checkout.giftCard?.amount ?? 0) > 0) {
        const redeemed = await giftCardService.redeemAmount(idOf(checkout.giftCard!.giftCard), checkout.giftCard!.amount, ctx);
        if (!redeemed) {
            if (!moneyCaptured) {
                throw apiValidationException("gift_card_balance_changed", null, null, ctx.languageCode);
            }
            shortfalls.push({event: "gift_card_shortfall", note: `Gift card ${checkout.giftCard!.code} could not be redeemed`});
        }
    }

    const {productTypes, variantLabels} = await lineSnapshotFacts(checkout, ctx);
    const currency = await Currency.findById(idOf(checkout.currency), {abbreviation: 1}).session(ctx.session ?? null).lean();
    const orderNumber = await generateOrderNumber(companyId);
    const now = new Date();
    const paymentStatus = paid ? "paid" : "unpaid";

    const order = new ProductOrder({
        company: companyId,
        orderNumber,
        status: paid ? "confirmed" : "pending",
        paymentStatus,
        fulfillmentStatus: "unfulfilled",
        customer: customerId,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        items: (checkout.items as any[]).map(item => ({
            product: idOf(item.product),
            variant: item.variant ? idOf(item.variant) : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            snapshot: {
                title: item.snapshot?.title ?? "",
                sku: item.snapshot?.sku ?? undefined,
                imageUrl: item.snapshot?.imageUrl ?? undefined,
                variantLabel: item.variant ? variantLabels.get(idOf(item.variant).toString()) || undefined : undefined,
                productType: productTypes.get(idOf(item.product).toString()),
            },
        })),
        currency: idOf(checkout.currency),
        currencyCode: currency?.abbreviation,
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
            ? {giftCard: idOf(checkout.giftCard.giftCard), code: checkout.giftCard.code, amount: checkout.giftCard.amount}
            : undefined,
        stripePaymentIntentId: checkout.stripePaymentIntentId,
        idempotencyKey: checkout.idempotencyKey,
        // The stock held for the checkout now belongs to the order, until it ships
        reservations: (checkout.reservations ?? [])
            .filter(reservation => reservation.state === "reserved")
            .map(({product, variant, warehouse, quantity, state}) => ({product, variant, warehouse, quantity, state})),
        notes: contact.notes || undefined,
        timeline: [
            {event: "order_placed", timestamp: now, userId: customerId},
            ...(paid ? [{event: "payment_received", timestamp: now}] : []),
            ...shortfalls.map(s => ({event: s.event, timestamp: now, note: s.note})),
        ],
    });
    await order.save({session: ctx.session});

    if (charge) {
        await paymentTransactionService.attachProductOrder(charge._id as ObjectId, order._id as ObjectId, {
            ...ctx,
            checkoutId: checkout._id as ObjectId,
        });
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
                currency: idOf(checkout.currency),
                metadata: {giftCardCode: checkout.giftCard!.code, checkoutId: checkout._id.toString()},
                company: companyId,
            } as any,
            ctx,
        );
    }

    checkout.status = "confirmed";
    checkout.reservations = [];
    await checkout.save({session: ctx.session});

    if (paid) {
        await fulfillOrderPaidExtras(order, ctx);
    }

    if (customerId) {
        await Cart.updateOne(
            {user: customerId, company: companyId},
            {$set: {items: [], subtotal: 0, discountTotal: 0, appliedDiscounts: []}, $unset: {appliedGiftCard: 1}},
            {session: ctx.session},
        );
    }

    // Sent once the placement transaction commits
    const notify = {companyId, languageCode: ctx.languageCode, session: ctx.session, order, customerId: customerId?.toString(), orderEmail: contact.email};
    await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PLACED, {...notify, extra: {grandTotal: order.grandTotal}});
    if (paid) {
        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PAID, {...notify, extra: {grandTotal: order.grandTotal}});
    }
    await notifyMerchantsNewOrder({
        companyId,
        languageCode: ctx.languageCode,
        session: ctx.session,
        orderId: order._id.toString(),
        orderNumber,
        grandTotal: order.grandTotal,
        currency: order.currency,
    });

    return {order, created: true};
}

/**
 * Places the order for a paid checkout outside an HTTP request (payment
 * webhook, expiry job) in its own transaction. withTransaction retries
 * transient conflicts — e.g. racing the buyer's own /confirm — and the retry
 * then finds the order and returns it.
 */
export async function placePaidCheckoutInBackground(
    checkoutId: ObjectId,
    ctx: Omit<PlacementCtx, "session">,
): Promise<IProductOrder | null> {
    const session = await mongooseInstance.startSession();
    let placed: IProductOrder | null = null;
    const logFailure = (error: unknown) => ctx.logger?.err?.("After-commit task failed", error);
    try {
        await session.withTransaction(async () => {
            placed = null;
            // A retried attempt starts clean: notifications queued by the aborted one are dropped
            await flushAfterCommitTasks(session, false, logFailure);
            const checkout = await Checkout.findOne({_id: checkoutId}).session(session);
            if (!checkout || !["pending", "payment_processing", "confirmed", "expired"].includes(checkout.status)) return;

            // The account login (username) is the buyer's email address
            const owner = checkout.user ? await User.findById(idOf(checkout.user), {username: 1}).session(session) : null;
            const result = await placeOrderFromCheckout(checkout, {email: owner?.username}, {...ctx, session});
            placed = result.order;
        });
        await flushAfterCommitTasks(session, true, logFailure);
    } finally {
        await session.endSession();
    }
    return placed;
}
