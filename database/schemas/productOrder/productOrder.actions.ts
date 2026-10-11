import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {shipProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/shipProductOrder.form.validator";
import type {ShipProductOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/shipProductOrder.form.validator";
import {cancelProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/cancelProductOrder.form.validator";
import type {CancelProductOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/cancelProductOrder.form.validator";
import {refundProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/refundProductOrder.form.validator";
import type {RefundProductOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/refundProductOrder.form.validator";
import {markPaidProductOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/markPaidProductOrder.form.validator";
import type {MarkPaidProductOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/markPaidProductOrder.form.validator";
import type {ProductOrderPaymentStatus, ProductOrderStatus} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.schema-def";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {UserContext} from "@coreModule/utilities/types/types";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {checkoutService} from "@eCommerceModule/database/schemas/checkout/checkout.service";
import {giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import {digitalDeliveryService} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery.service";
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
import {currencyService} from "@coreModule/database/schemas/currency/currency.service";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import ProductOrderModel, {type IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";

const CANCEL_BLOCKED: ProductOrderStatus[] = ["shipped", "delivered", "cancelled", "refunded"];
const SHIP_READY: ProductOrderStatus[] = ["confirmed", "processing"];
const CLOSED: ProductOrderStatus[] = ["cancelled", "refunded"];
const REFUNDABLE: ProductOrderPaymentStatus[] = ["paid", "partially_refunded"];

function blankToUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function assertFieldWrite(
    params: {languageCode: string; actionUserCtx: UserContext},
    field: "status" | "paymentStatus",
): void {
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

function requireCurrency(order: IProductOrder, languageCode: string, code: string): ObjectId {
    const currencyId = nestedEntityToRef(order.currency);
    if (!currencyId) {
        throw apiValidationException(code, "", null, languageCode);
    }
    return currencyId;
}

async function recreditStoreCredit(
    order: IProductOrder,
    ctx: CrudOptions & {auditUserId?: ObjectId | string},
): Promise<boolean> {
    const storeCredit = order.giftCard;
    if (!storeCredit || storeCredit.amount <= 0) return false;
    const giftCardId = nestedEntityToRef(storeCredit.giftCard);
    if (!giftCardId) return false;
    const recredited = await giftCardService.recreditAmount(giftCardId, storeCredit.amount, ctx);
    return recredited != null;
}

async function notifyCustomer(
    order: IProductOrder,
    code: string,
    companyId: ObjectId,
    languageCode: string,
    extra: {trackingNumber?: string; trackingUrl?: string; carrier?: string; grandTotal?: number; amount?: number} = {},
): Promise<void> {
    await notifyProductOrderCustomer(code, {companyId, languageCode, order, extra});
}

/**
 * Order lifecycle actions write system-managed fields, so they are gated on the
 * field-level write tags instead of generic CRUD edit: `productorders[write:status]`
 * for status transitions and `productorders[write:paymentStatus]` for money
 * movements (mark paid / refund). Admin roles receive both tags at boot.
 */
export class ProductOrderActions {
    /** Admin acknowledges a pending (typically COD / bank transfer) order. */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async confirm(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertFieldWrite(params, "status");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        logger.start(`Confirming product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (order.status !== "pending") {
            throw apiValidationException("order_not_pending", "", null, languageCode);
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {status: "confirmed"},
                $push: {timeline: {event: "order_confirmed", timestamp: new Date(), userId: actionUserCtx.userId}},
            },
            ctx,
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
    async markProcessing(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertFieldWrite(params, "status");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        logger.start(`Marking product order processing: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (order.status !== "confirmed") {
            throw apiValidationException("order_must_be_confirmed_first", "", null, languageCode);
        }

        await productOrderService.updateByIdOrThrow(
            order._id,
            {
                $set: {status: "processing"},
                $push: {timeline: {event: "order_processing", timestamp: new Date(), userId: actionUserCtx.userId}},
            },
            ctx,
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
    async ship(params: TransactionRequiredParams & ShipProductOrderFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, carrier, trackingNumber, trackingUrl, notes} = params;
        assertFieldWrite(params, "status");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};
        const carrierValue = blankToUndefined(carrier);
        const tracking = blankToUndefined(trackingNumber);
        const trackingLink = blankToUndefined(trackingUrl);
        const note = blankToUndefined(notes);

        logger.start(`Shipping product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (!SHIP_READY.includes(order.status)) {
            throw apiValidationException("order_not_ready_to_ship", "", null, languageCode);
        }

        SchemaGuard.checkModelPermission(Fulfillment, "create", actionUserCtx, languageCode);

        await fulfillmentService.create(
            {
                order: order._id,
                company: company._id,
                items: order.items.map((item) => ({
                    orderItemId: new ObjectId(item._id.toString()),
                    quantity: item.quantity,
                })),
                carrier: carrierValue,
                trackingNumber: tracking,
                trackingUrl: trackingLink,
                shippedAt: new Date(),
                status: "shipped",
                notes: note,
            },
            ctx,
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
                        note: tracking,
                    },
                },
            },
            ctx,
        );

        await notifyCustomer(order, NotificationEventCodes.PRODUCT_ORDER_SHIPPED, company._id, languageCode, {
            trackingNumber: tracking ?? "",
            trackingUrl: trackingLink ?? "",
            carrier: carrierValue ?? "",
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
    async cancel(params: TransactionRequiredParams & CancelProductOrderFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reason} = params;
        assertFieldWrite(params, "status");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        logger.start(`Cancelling product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (CANCEL_BLOCKED.includes(order.status)) {
            throw apiValidationException("order_cannot_be_cancelled", "", null, languageCode);
        }
        if (REFUNDABLE.includes(order.paymentStatus)) {
            throw apiValidationException("refund_order_before_cancelling", "", null, languageCode);
        }

        const checkout = await checkoutService.findOne(
            {idempotencyKey: order.idempotencyKey, company: company._id},
            ctx,
        );
        if (checkout?.reservations?.some((reservation) => reservation.state === "reserved")) {
            await releaseCheckoutReservations(checkout, ctx);
        }

        const storeCredit = order.giftCard;
        if (storeCredit && storeCredit.amount > 0) {
            const giftCardId = nestedEntityToRef(storeCredit.giftCard);
            if (!giftCardId) {
                throw apiValidationException("order_cannot_be_cancelled", "", null, languageCode);
            }
            await giftCardService.recreditAmount(giftCardId, storeCredit.amount, ctx);
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
                        note: blankToUndefined(reason),
                    },
                },
            },
            ctx,
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
    async markPaid(params: TransactionRequiredParams & MarkPaidProductOrderFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reference} = params;
        assertFieldWrite(params, "paymentStatus");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};
        const paymentReference = blankToUndefined(reference);

        logger.start(`Marking product order paid: ${_id}...`);

        const order = await productOrderService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, ctx);

        if (order.paymentStatus !== "unpaid" || CLOSED.includes(order.status)) {
            throw apiValidationException("order_not_awaiting_payment", "", null, languageCode);
        }

        const currencyId = requireCurrency(order, languageCode, "order_not_awaiting_payment");
        await paymentTransactionService.create(
            {
                sourceType: "productOrder",
                sourceId: new ObjectId(order._id.toString()),
                gateway: "manual",
                type: "charge",
                status: "succeeded",
                amount: order.grandTotal,
                currency: currencyId,
                refundedAmount: 0,
                metadata: paymentReference ? {reference: paymentReference} : undefined,
                company,
            },
            ctx,
        );

        const checkout = await checkoutService.findOne(
            {idempotencyKey: order.idempotencyKey, company: company._id},
            ctx,
        );
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
                        note: paymentReference,
                    },
                },
            },
            ctx,
        );

        await fulfillOrderPaidExtras(updated, ctx);
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
    async refund(params: TransactionRequiredParams & RefundProductOrderFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, amount, reason} = params;
        assertFieldWrite(params, "paymentStatus");
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};
        const refundReason = blankToUndefined(reason);
        const orderId = new ObjectId(_id);

        logger.start(`Refunding product order: ${_id}...`);

        const order = await productOrderService.findOneOrThrow({_id: orderId, company: company._id}, ctx);

        if (!REFUNDABLE.includes(order.paymentStatus)) {
            throw apiValidationException("order_not_refundable", "", null, languageCode);
        }

        const charge = await paymentTransactionService.findOne(
            {
                sourceType: "productOrder",
                sourceId: orderId,
                type: "charge",
                status: {$in: ["succeeded", "partially_refunded"]},
                company: company._id,
            },
            ctx,
        );
        if (!charge) {
            throw apiValidationException("no_charge_transaction_found", "", null, languageCode);
        }

        const alreadyRefunded = charge.refundedAmount ?? 0;
        const remaining = charge.amount - alreadyRefunded;
        const refundAmount = amount ?? remaining;
        if (refundAmount <= 0 || refundAmount > remaining) {
            throw apiValidationException("invalid_refund_amount", "", null, languageCode);
        }

        const currencyId = requireCurrency(order, languageCode, "order_not_refundable");

        let gatewayRefundId: string | undefined;
        if (charge.gateway !== "manual" && charge.gatewayTransactionId) {
            const adapter = getPaymentAdapter(charge.gateway);
            if (!adapter || !adapter.isEnabled()) {
                throw apiValidationException("payment_gateway_not_configured", "", null, languageCode);
            }
            const currency = await currencyService.findById(currencyId, ctx, undefined, "abbreviation");
            const result = await adapter.createRefund({
                gatewayTransactionId: charge.gatewayTransactionId,
                amount: refundAmount < remaining ? refundAmount : undefined,
                currencyCode: currency?.abbreviation ?? "usd",
                reason: refundReason,
                idempotencyKey: `refund-${orderId.toString()}-${Math.round(refundAmount * 100)}-${alreadyRefunded}`,
            });
            gatewayRefundId = result.id;
        }

        await paymentTransactionService.recordRefund(
            {
                sourceType: "productOrder",
                sourceId: orderId,
                chargeTransactionId: new ObjectId(charge._id.toString()),
                gateway: charge.gateway,
                amount: refundAmount,
                currency: currencyId,
                gatewayTransactionId: gatewayRefundId,
                metadata: refundReason ? {reason: refundReason} : undefined,
                company: company._id,
            },
            ctx,
        );

        const fullyRefunded = refundAmount >= remaining;
        const timelineNotes: {event: string; note?: string}[] = [];

        if (fullyRefunded) {
            const storeCredit = order.giftCard;
            if (storeCredit && storeCredit.amount > 0) {
                const returned = await recreditStoreCredit(order, ctx);
                if (!returned) {
                    logger.warn(`Gift card for order ${_id} not re-credited (disabled or missing)`);
                }
            }

            const disabledCards = await giftCardService.updateMany(
                {order: orderId, company: company._id, status: {$ne: "disabled"}},
                {$set: {status: "disabled"}},
                ctx,
            );
            if (disabledCards.modifiedCount) {
                timelineNotes.push({event: "gift_cards_disabled", note: String(disabledCards.modifiedCount)});
            }
            await digitalDeliveryService.updateMany(
                {order: orderId, company: company._id},
                {$set: {expiresAt: new Date()}},
                ctx,
            );

            if (order.fulfillmentStatus === "unfulfilled") {
                const checkout = await checkoutService.findOne(
                    {idempotencyKey: order.idempotencyKey, company: company._id},
                    ctx,
                );
                if (checkout) {
                    await restockConsumedReservations(checkout, {...ctx, referenceId: orderId});
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
                                note: refundReason,
                            },
                            ...timelineNotes.map((entry) => ({...entry, timestamp: now, userId: actionUserCtx.userId})),
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
