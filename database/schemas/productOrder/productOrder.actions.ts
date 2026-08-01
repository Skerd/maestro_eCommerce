import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {shipProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/shipProductOrder.form.validator";
import {cancelProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/cancelProductOrder.form.validator";
import {refundProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/refundProductOrder.form.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {releaseCheckoutReservations} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {getPaymentAdapter} from "@eCommerceModule/utilities/services/payment/paymentService";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import Currency from "@coreModule/database/schemas/currency/currency";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";

async function notifyCustomer(
    order: IProductOrder,
    code: string,
    companyId: ObjectId,
    languageCode: string,
    extra: Record<string, unknown> = {},
): Promise<void> {
    await notifyProductOrderCustomer(code, {companyId, languageCode, order, extra});
}

export class ProductOrderActions {
    /** Admin acknowledges a pending (typically COD / bank transfer) order. */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async confirm(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Confirming product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {
                _id: new ObjectId(_id),
                company: company._id
            },
            {session, logger, languageCode},
        );

        if (order.status !== "pending") {
            throw apiValidationException("order_not_pending", null, null, languageCode);
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    status: "confirmed"
                },
                $push: {
                    timeline: {
                        event: "order_confirmed",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId
                    }
                }
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await notifyCustomer(order, NotificationEventCodes.PRODUCT_ORDER_CONFIRMED, company._id, languageCode);

        logger.finish(`Successfully confirmed product order: ${_id}`);

        return {message: "Order confirmed successfully"};
    }

    /** Marks a confirmed order as processing (being prepared for shipment). */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async markProcessing(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Marking product order processing: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {
                _id: new ObjectId(_id),
                company: company._id
            },
            {session, logger, languageCode},
        );

        if (order.status !== "confirmed") {
            throw apiValidationException("order_must_be_confirmed_first", null, null, languageCode);
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    status: "processing"
                },
                $push: {
                    timeline: {
                        event: "order_processing",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId
                    }
                }
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Successfully marked product order processing: ${_id}`);

        return {message: "Order marked as processing"};
    }

    /** Ships the order: creates a Fulfillment with tracking data and updates statuses. */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: shipProductOrderFormSchema,
    })
    async ship(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, carrier, trackingNumber, trackingUrl, notes} = params;

        logger.start(`Shipping product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {
                _id: new ObjectId(_id),
                company: company._id
            },
            {session, logger, languageCode},
        );

        if (!["confirmed", "processing"].includes((order).status)) {
            throw apiValidationException("order_not_ready_to_ship", null, null, languageCode);
        }

        SchemaGuard.checkModelPermission(Fulfillment, "create", actionUserCtx, languageCode);

        await fulfillmentService.create(
            {
                order: order._id,
                company: company._id,
                items: (order.items ?? []).map((item) => ({orderItemId: item._id, quantity: item.quantity})),
                carrier: carrier?.trim?.() || undefined,
                trackingNumber: trackingNumber?.trim?.() || undefined,
                trackingUrl: trackingUrl?.trim?.() || undefined,
                shippedAt: new Date(),
                status: "shipped",
                notes: notes?.trim?.() || undefined,
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    status: "shipped",
                    fulfillmentStatus: "fulfilled"
                },
                $push: {
                    timeline: {
                        event: "order_shipped",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId,
                        note: trackingNumber || undefined
                    }
                },
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await notifyCustomer(
            order,
            NotificationEventCodes.PRODUCT_ORDER_SHIPPED,
            company._id,
            languageCode,
            {
                trackingNumber: trackingNumber ?? "",
                trackingUrl: trackingUrl ?? "",
                carrier: carrier ?? "",
            },
        );

        logger.finish(`Successfully shipped product order: ${_id}`);

        return {message: "Order shipped successfully"};
    }

    /**
     * Cancels an order that has not shipped. Paid orders must be refunded
     * first (the refund action), so cancellation never strands captured money.
     * Releases any still-held inventory reservations from the checkout.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: cancelProductOrderFormSchema,
    })
    async cancel(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reason} = params;

        logger.start(`Cancelling product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {
                _id: new ObjectId(_id),
                company: company._id
            },
            {session, logger, languageCode},
        );

        if (["shipped", "delivered", "cancelled", "refunded"].includes(order.status)) {
            throw apiValidationException("order_cannot_be_cancelled", null, null, languageCode);
        }
        if (["paid", "partially_refunded"].includes(order.paymentStatus)) {
            throw apiValidationException("refund_order_before_cancelling", null, null, languageCode);
        }

        const checkout = await Checkout.findOne({idempotencyKey: order.idempotencyKey, company: company._id}).session(session);
        if (checkout && (checkout.reservations ?? []).some(r => r.state === "reserved")) {
            await releaseCheckoutReservations(checkout, {session, logger, languageCode, auditUserId: actionUserCtx.userId});
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    status: "cancelled"
                },
                $push: {
                    timeline: {
                        event: "order_cancelled",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId,
                        note: reason?.trim?.() || undefined
                    }
                },
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await notifyCustomer(
            order,
            NotificationEventCodes.PRODUCT_ORDER_CANCELLED,
            company._id,
            languageCode,
        );

        logger.finish(`Successfully cancelled product order: ${_id}`);

        return {message: "Order cancelled successfully"};
    }

    /**
     * Refunds a paid order (full by default, partial via amount). Gateway
     * charges are refunded through the payment adapter; manual (COD / bank
     * transfer) payments are recorded as manual refund transactions.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
        schema: refundProductOrderFormSchema,
    })
    async refund(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, amount, reason} = params;

        logger.start(`Refunding product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {
                _id: new ObjectId(_id),
                company: company._id
            },
            {session, logger, languageCode},
        );

        if (!["paid", "partially_refunded"].includes(order.paymentStatus)) {
            throw apiValidationException("order_not_refundable", null, null, languageCode);
        }

        const charge = await paymentTransactionService.findOne(
            {
                sourceType: "productOrder",
                sourceId: order._id,
                type: "charge",
                status: {
                    $in: ["succeeded", "partially_refunded"]
                },
                company: company._id
            },
            {session, logger, languageCode},
        );
        if (!charge) {
            throw apiValidationException("no_charge_transaction_found", null, null, languageCode);
        }

        const remaining = charge.amount - (charge.refundedAmount ?? 0);
        const refundAmount = amount ?? remaining;
        if (refundAmount <= 0 || refundAmount > remaining) {
            throw apiValidationException("invalid_refund_amount", null, null, languageCode);
        }

        const currencyId = order.currency?._id ?? order.currency;

        let gatewayRefundId: string | undefined;
        if (charge.gateway !== "manual" && charge.gatewayTransactionId) {
            const adapter = getPaymentAdapter(charge.gateway);
            if (!adapter || !adapter.isEnabled()) {
                throw apiValidationException("payment_gateway_not_configured", null, null, languageCode);
            }
            const currency = await Currency.findById(currencyId, {abbreviation: 1}).session(session);
            const result = await adapter.createRefund({
                gatewayTransactionId: charge.gatewayTransactionId,
                amount: refundAmount < remaining ? refundAmount : undefined,
                currencyCode: currency?.abbreviation ?? "usd",
                reason: reason?.trim?.() || undefined,
                idempotencyKey: `refund-${order._id.toString()}-${Math.round(refundAmount * 100)}-${(charge.refundedAmount ?? 0)}`,
            });
            gatewayRefundId = result.id;
        }

        await paymentTransactionService.recordRefund(
            {
                sourceType: "productOrder",
                sourceId: order._id as ObjectId,
                chargeTransactionId: charge._id,
                gateway: charge.gateway,
                amount: refundAmount,
                currency: currencyId,
                gatewayTransactionId: gatewayRefundId,
                metadata: reason ? {reason} : undefined,
                company: company._id,
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const fullyRefunded = refundAmount >= remaining;

        // Full refunds also return the store-credit portion to the gift card
        // (partial refunds stay gateway-only — documented behavior).
        const giftCardEntry = order.giftCard;
        if (fullyRefunded && (giftCardEntry?.amount ?? 0) > 0) {
            const giftCardId = new ObjectId((giftCardEntry.giftCard?._id ?? giftCardEntry.giftCard).toString());
            const recredited = await giftCardService.recreditAmount(
                giftCardId,
                giftCardEntry.amount,
                {session, logger, languageCode, auditUserId: actionUserCtx.userId},
            );
            if (!recredited) {
                logger.warn(`Gift card ${giftCardId} not re-credited for order ${_id} (disabled or missing)`);
            }
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    paymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
                    ...(fullyRefunded ? {status: "refunded"} : {}),
                },
                $push: {
                    timeline: {
                        event: fullyRefunded ? "order_refunded" : "order_partially_refunded",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId,
                        note: reason?.trim?.() || undefined
                    }
                },
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await notifyCustomer(
            order,
            NotificationEventCodes.PRODUCT_ORDER_REFUNDED,
            company._id,
            languageCode,
            {
                amount: refundAmount,
            },
        );

        logger.finish(`Successfully refunded product order: ${_id}`);

        return {message: "Order refunded successfully"};
    }
}
