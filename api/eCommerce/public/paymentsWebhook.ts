import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {emitNotificationEvent, NotificationEventCodes} from "@coreModule/domain/notifications/notificationEventBus";
import Checkout, {ICheckout} from "@eCommerceModule/database/schemas/checkout/checkout";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import EscrowTransaction from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";
import PaymentWebhookEvent from "@eCommerceModule/database/schemas/paymentWebhookEvent/paymentWebhookEvent";
import {paymentTransactionService} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {consumeCheckoutReservations} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {getPaymentAdapter} from "@eCommerceModule/utilities/services/payment/paymentService";
import type {WebhookEvent} from "@eCommerceModule/utilities/services/payment/paymentProvider.types";

export const basePath = "/api/eCommerce/paymentsWebhook";
export const router = Router();

const MONGO_DUPLICATE_KEY = 11000;

/**
 * Marks the order behind a checkout as paid: paymentStatus, status, timeline,
 * reservation consumption, and buyer notification. No-ops when the order does
 * not exist yet (buyer has not confirmed) — /confirm settles payment state then.
 */
async function applyPaymentSucceeded(checkout: ICheckout, ctx: {logger: any; languageCode: string}): Promise<void> {
    const companyId = (checkout.company as any)?._id ?? (checkout.company as any);

    const order = await ProductOrder.findOne({idempotencyKey: checkout.idempotencyKey, company: companyId});
    if (!order) return;

    if (order.paymentStatus === "unpaid") {
        order.paymentStatus = "paid";
        if (order.status === "pending") order.status = "confirmed";
        (order.timeline as any[]).push({event: "payment_received", timestamp: new Date()});
        await order.save();

        await consumeCheckoutReservations(checkout, ctx);
        await fulfillOrderPaidExtras(order, ctx);

        const customerId = ((order.customer as any)?._id ?? order.customer)?.toString?.() ?? "";
        if (customerId) {
            emitNotificationEvent(NotificationEventCodes.PRODUCT_ORDER_PAID, {
                receiverIds: [customerId],
                payload: {
                    companyId: companyId.toString(),
                    languageCode: ctx.languageCode,
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                },
            });
        }
    }
}

/**
 * Stripe webhook — authenticated by signature over the raw body (stashed by
 * the apiServer body parser for this route), not by JWT. Idempotent per event
 * id via the PaymentWebhookEvent unique index.
 */
router.post(
    "/stripe",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (params: any, _queryParams: any, req: any) => {
        const {logger, languageCode} = params;

        const adapter = getPaymentAdapter("stripe");
        if (!adapter || !adapter.isEnabled()) {
            throw apiValidationException("payment_gateway_not_configured", null, null, languageCode);
        }

        const signature = req.header("stripe-signature");
        const rawBody = req.rawBody;
        if (!signature || !rawBody) {
            throw apiValidationException("invalid_webhook_signature", null, null, languageCode);
        }

        let event: WebhookEvent;
        try {
            event = adapter.constructWebhookEvent(rawBody, signature);
        } catch (e: any) {
            logger.warn(`Stripe webhook signature verification failed: ${e.message}`);
            throw apiValidationException("invalid_webhook_signature", null, null, languageCode);
        }

        // Idempotency: first processor wins, redeliveries are acknowledged
        try {
            await PaymentWebhookEvent.create({gateway: "stripe", eventId: event.id, eventType: event.type});
        } catch (e: any) {
            if (e?.code === MONGO_DUPLICATE_KEY) {
                return {received: true, duplicate: true};
            }
            throw e;
        }

        if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
            const intent = event.data as any;
            const intentId = intent.id as string;

            const checkout = await Checkout.findOne({stripePaymentIntentId: intentId});

            if (event.type === "payment_intent.succeeded") {
                await paymentTransactionService.markSucceeded(intentId, {eventId: event.id}, {logger, languageCode});
                if (checkout) {
                    await applyPaymentSucceeded(checkout, {logger, languageCode});
                }
            } else {
                const failureReason = intent.last_payment_error?.message as string | undefined;
                await paymentTransactionService.markFailed(intentId, failureReason, {eventId: event.id}, {logger, languageCode});
                if (checkout && checkout.status === "payment_processing") {
                    checkout.status = "pending"; // buyer can retry with another method
                    await checkout.save();
                }
            }

            // Marketplace escrow holds: mirror the customer's payment outcome
            // onto the hold ledger row so releases/refunds know the money is real.
            await EscrowTransaction.updateMany(
                {gatewayPaymentIntentId: intentId, type: "hold"},
                {$set: {gatewayStatus: event.type === "payment_intent.succeeded" ? "succeeded" : "failed"}},
            );
        } else {
            logger.debug(`Ignoring unhandled stripe event type: ${event.type}`);
        }

        return {received: true};
    }),
);
