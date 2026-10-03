import {ObjectId} from "mongodb";
import {Types} from "mongoose";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {shipProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/shipProductOrder.form.validator";
import {cancelProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/cancelProductOrder.form.validator";
import {refundProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/refundProductOrder.form.validator";
import {markPaidProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/markPaidProductOrder.form.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import GiftCard from "@financeModule/database/schemas/giftCard/giftCard";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {
    consumeCheckoutReservations,
    releaseCheckoutReservations,
    restockConsumedReservations,
} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {getPaymentAdapter} from "@eCommerceModule/utilities/services/payment/paymentService";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import Currency from "@coreModule/database/schemas/currency/currency";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import ProductOrderModel, {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";

async function notifyCustomer(
    order: IProductOrder,
    code: string,
    companyId: ObjectId,
    languageCode: string,
    extra: Record<string, unknown> = {},
): Promise<void> {
    await notifyProductOrderCustomer(code, {companyId, languageCode, order, extra});
}

/**
 * Order lifecycle actions write system-managed fields, so they are gated on the
 * field-level write tags instead of generic CRUD edit: `productorders[write:status]`
 * for status transitions and `productorders[write:paymentStatus]` for money
 * movements (mark paid / refund). Admin roles receive both tags at boot.
 */
function assertFieldWrite(params: Record<string, any>, field: "status" | "paymentStatus"): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        ProductOrderModel,
        getModelCollectedData("productOrders").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields[field]) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
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
        assertFieldWrite(params, "status");

        logger.start(`Confirming product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (order.status !== "pending") {
            throw apiValidationException("order_not_pending", null, null, languageCode);
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {status: "confirmed"},
                $push: {timeline: {event: "order_confirmed", timestamp: new Date(), userId: actionUserCtx.userId}},
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
        assertFieldWrite(params, "status");

        logger.start(`Marking product order processing: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (order.status !== "confirmed") {
            throw apiValidationException("order_must_be_confirmed_first", null, null, languageCode);
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {status: "processing"},
                $push: {timeline: {event: "order_processing", timestamp: new Date(), userId: actionUserCtx.userId}},
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
        assertFieldWrite(params, "status");

        logger.start(`Shipping product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (!["confirmed", "processing"].includes(order.status)) {
            throw apiValidationException("order_not_ready_to_ship", null, null, languageCode);
        }

        SchemaGuard.checkModelPermission(Fulfillment, "create", actionUserCtx, languageCode);

        await fulfillmentService.create(
            {
                order: order._id,
                company: company._id,
                items: (order.items ?? []).map((item) => ({orderItemId: new Types.ObjectId(String(item._id)), quantity: item.quantity})),
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
                $set: {status: "shipped", fulfillmentStatus: "fulfilled"},
                $push: {
                    timeline: {
                        event: "order_shipped",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId,
                        note: trackingNumber || undefined,
                    },
                },
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await notifyCustomer(order, NotificationEventCodes.PRODUCT_ORDER_SHIPPED, company._id, languageCode, {
            trackingNumber: trackingNumber ?? "",
            trackingUrl: trackingUrl ?? "",
            carrier: carrier ?? "",
        });

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
        assertFieldWrite(params, "status");

        logger.start(`Cancelling product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
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

        // Store credit spent on an unpaid order goes back to the card
        if ((order.giftCard?.amount ?? 0) > 0) {
            const giftCardId = new ObjectId((order.giftCard.giftCard?._id ?? order.giftCard.giftCard).toString());
            await giftCardService.recreditAmount(giftCardId, order.giftCard.amount, {session, logger, languageCode, auditUserId: actionUserCtx.userId});
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {status: "cancelled"},
                $push: {
                    timeline: {
                        event: "order_cancelled",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId,
                        note: reason?.trim?.() || undefined,
                    },
                },
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await notifyCustomer(order, NotificationEventCodes.PRODUCT_ORDER_CANCELLED, company._id, languageCode);

        logger.finish(`Successfully cancelled product order: ${_id}`);

        return {message: "Order cancelled successfully"};
    }

    /**
     * Records an offline payment (cash on delivery / bank transfer) as received:
     * writes a manual charge transaction, converts the held stock into a sale,
     * issues gift cards / downloads bought with the order, and notifies the buyer.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: markPaidProductOrderFormSchema,
    })
    async markPaid(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reference} = params;
        assertFieldWrite(params, "paymentStatus");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        logger.start(`Marking product order paid: ${_id}...`);

        const order = await productOrderService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, ctx);

        if (order.paymentStatus !== "unpaid" || ["cancelled", "refunded"].includes(order.status)) {
            throw apiValidationException("order_not_awaiting_payment", null, null, languageCode);
        }

        await paymentTransactionService.create(
            {
                sourceType: "productOrder",
                sourceId: order._id,
                gateway: "manual",
                type: "charge",
                status: "succeeded",
                amount: order.grandTotal,
                currency: order.currency?._id ?? order.currency,
                refundedAmount: 0,
                metadata: reference?.trim?.() ? {reference: reference.trim()} : undefined,
                company: company._id,
            } as any,
            ctx,
        );

        const checkout = await Checkout.findOne({idempotencyKey: order.idempotencyKey, company: company._id}).session(session);
        if (checkout) {
            await consumeCheckoutReservations(checkout, ctx);
        } else {
            logger.warn(`Order ${_id} marked paid without its checkout — held stock not converted to a sale`);
        }

        const updated = await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    paymentStatus: "paid",
                    ...(order.status === "pending" ? {status: "confirmed"} : {}),
                },
                $push: {
                    timeline: {
                        event: "payment_received",
                        timestamp: new Date(),
                        userId: actionUserCtx.userId,
                        note: reference?.trim?.() || undefined,
                    },
                },
            },
            {...ctx},
        );

        await fulfillOrderPaidExtras(updated ?? order, ctx);
        await notifyCustomer(order, NotificationEventCodes.PRODUCT_ORDER_PAID, company._id, languageCode, {grandTotal: order.grandTotal});

        logger.finish(`Successfully marked product order paid: ${_id}`);

        return {message: "Order marked as paid"};
    }

    /**
     * Refunds a paid order (full by default, partial via amount). Gateway
     * charges are refunded through the payment adapter; manual (COD / bank
     * transfer) payments are recorded as manual refund transactions. A full
     * refund also returns spent store credit, disables gift cards and download
     * links the order issued, and restocks the items when nothing has shipped.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
        schema: refundProductOrderFormSchema,
    })
    async refund(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, amount, reason} = params;
        assertFieldWrite(params, "paymentStatus");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        logger.start(`Refunding product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, ctx);

        if (!["paid", "partially_refunded"].includes(order.paymentStatus)) {
            throw apiValidationException("order_not_refundable", null, null, languageCode);
        }

        const charge = await paymentTransactionService.findOne(
            {
                sourceType: "productOrder",
                sourceId: order._id,
                type: "charge",
                status: {$in: ["succeeded", "partially_refunded"]},
                company: company._id,
            },
            ctx,
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
            ctx,
        );

        const fullyRefunded = refundAmount >= remaining;
        const timelineNotes: {event: string; note?: string}[] = [];

        if (fullyRefunded) {
            // Store credit spent on this order goes back to the card
            const giftCardEntry = order.giftCard;
            if ((giftCardEntry?.amount ?? 0) > 0) {
                const giftCardId = new ObjectId((giftCardEntry.giftCard?._id ?? giftCardEntry.giftCard).toString());
                const recredited = await giftCardService.recreditAmount(giftCardId, giftCardEntry.amount, ctx);
                if (!recredited) {
                    logger.warn(`Gift card ${giftCardId} not re-credited for order ${_id} (disabled or missing)`);
                }
            }

            // Gift cards and downloads bought with this order are revoked
            const disabledCards = await GiftCard.updateMany(
                {order: order._id, company: company._id, status: {$ne: "disabled"}},
                {$set: {status: "disabled"}},
                {session},
            );
            if (disabledCards.modifiedCount) {
                timelineNotes.push({event: "gift_cards_disabled", note: String(disabledCards.modifiedCount)});
            }
            await DigitalDelivery.updateMany(
                {order: order._id, company: company._id},
                {$set: {expiresAt: new Date()}},
                {session},
            );

            // Nothing shipped yet: the sold units go back on the shelf
            if (order.fulfillmentStatus === "unfulfilled") {
                const checkout = await Checkout.findOne({idempotencyKey: order.idempotencyKey, company: company._id}).session(session);
                if (checkout) {
                    await restockConsumedReservations(checkout, {...ctx, referenceId: order._id as ObjectId});
                } else {
                    timelineNotes.push({event: "restock_skipped", note: "Checkout record not found"});
                }
            }
        }

        const now = new Date();
        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {
                    paymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
                    ...(fullyRefunded ? {status: "refunded"} : {}),
                },
                $push: {
                    timeline: {
                        $each: [
                            {
                                event: fullyRefunded ? "order_refunded" : "order_partially_refunded",
                                timestamp: now,
                                userId: actionUserCtx.userId,
                                note: reason?.trim?.() || undefined,
                            },
                            ...timelineNotes.map(entry => ({...entry, timestamp: now, userId: actionUserCtx.userId})),
                        ],
                    },
                },
            },
            ctx,
        );

        await notifyCustomer(order, NotificationEventCodes.PRODUCT_ORDER_REFUNDED, company._id, languageCode, {
            amount: refundAmount,
        });

        logger.finish(`Successfully refunded product order: ${_id}`);

        return {message: "Order refunded successfully"};
    }
}
