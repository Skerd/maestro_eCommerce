import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {shipFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/shipFulfillment.form.validator";
import {fulfillmentStatusNotesFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillmentStatusNotes.form.validator";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import FulfillmentModel from "./fulfillment";
import {fulfillmentService} from "./fulfillment.service";

function trimOptional(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const t = value.trim();
    return t.length ? t : undefined;
}

function assertStatusWrite(params: Record<string, any>) {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        FulfillmentModel,
        getModelCollectedData("fulfillments").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.status) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
    return writeFields;
}

async function loadOrderForFulfillment(
    fulfillment: {order: any},
    companyId: ObjectId,
    opts: {session: any; logger: any; languageCode: string},
) {
    const orderId = (fulfillment.order?._id ?? fulfillment.order) as ObjectId;
    return productOrderService.findOneOrThrow(
        {_id: orderId, company: companyId},
        opts,
    );
}

export class FulfillmentActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: shipFulfillmentFormSchema,
        transaction: true,
    })
    async ship(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, carrier, trackingNumber, trackingUrl, notes} =
            params;

        const writeFields = assertStatusWrite(params);

        const existing = await fulfillmentService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "pending") {
            throw apiValidationException("fulfillment_not_pending", "", null, languageCode);
        }

        // Same gate as productOrder.ship: unconfirmed, cancelled or refunded orders don't ship
        const order = await loadOrderForFulfillment(existing, company._id, {session, logger, languageCode});
        if (["pending", "cancelled", "refunded"].includes(order.status)) {
            throw apiValidationException("order_not_ready_to_ship", "", null, languageCode);
        }

        const $set: Record<string, unknown> = {
            status: "shipped",
            shippedAt: new Date(),
        };

        if (trackingNumber !== undefined && writeFields.trackingNumber) {
            $set.trackingNumber = trimOptional(trackingNumber);
        }
        if (carrier !== undefined && writeFields.carrier) {
            $set.carrier = trimOptional(carrier);
        }
        if (trackingUrl !== undefined && writeFields.trackingUrl) {
            $set.trackingUrl = trimOptional(trackingUrl);
        }
        if (notes !== undefined && writeFields.notes) {
            $set.notes = trimOptional(notes) || existing.notes;
        }

        await fulfillmentService.updateByIdOrThrow(existing._id, $set, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
        });

        if (["confirmed", "processing"].includes(order.status)) {
            await productOrderService.updateByIdOrThrow(
                order._id,
                {
                    $set: {status: "shipped", fulfillmentStatus: "fulfilled"},
                    $push: {
                        timeline: {
                            event: "order_shipped",
                            timestamp: new Date(),
                            userId: actionUserCtx.userId,
                            note: ($set.trackingNumber as string) || undefined,
                        },
                    },
                },
                {session, logger, languageCode, auditUserId: actionUserCtx.userId},
            );
        }

        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_SHIPPED, {
            companyId: company._id,
            languageCode,
            order,
            extra: {
                trackingNumber: ($set.trackingNumber as string) ?? existing.trackingNumber ?? "",
                trackingUrl: ($set.trackingUrl as string) ?? existing.trackingUrl ?? "",
                carrier: ($set.carrier as string) ?? existing.carrier ?? "",
            },
        });

        return {message: "Fulfillment marked as shipped"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: fulfillmentStatusNotesFormSchema,
        transaction: true,
    })
    async markDelivered(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, notes} = params;

        const writeFields = assertStatusWrite(params);

        const existing = await fulfillmentService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "shipped") {
            throw apiValidationException("fulfillment_not_shipped", "", null, languageCode);
        }

        const $set: Record<string, unknown> = {
            status: "delivered",
            deliveredAt: new Date(),
        };
        if (notes !== undefined && writeFields.notes) {
            $set.notes = trimOptional(notes) || existing.notes;
        }

        await fulfillmentService.updateByIdOrThrow(existing._id, $set, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
        });

        const order = await loadOrderForFulfillment(existing, company._id, {session, logger, languageCode});
        // Never overwrite a terminal state (cancelled / refunded) with "delivered"
        if (["confirmed", "processing", "shipped"].includes(order.status)) {
            await productOrderService.updateByIdOrThrow(
                order._id,
                {
                    $set: {status: "delivered", fulfillmentStatus: "fulfilled"},
                    $push: {
                        timeline: {
                            event: "order_delivered",
                            timestamp: new Date(),
                            userId: actionUserCtx.userId,
                        },
                    },
                },
                {session, logger, languageCode, auditUserId: actionUserCtx.userId},
            );
        }

        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_DELIVERED, {
            companyId: company._id,
            languageCode,
            order,
        });

        return {message: "Fulfillment marked as delivered"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: fulfillmentStatusNotesFormSchema,
        transaction: true,
    })
    async markFailed(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, notes} = params;

        const writeFields = assertStatusWrite(params);

        const existing = await fulfillmentService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "pending" && existing.status !== "shipped") {
            throw apiValidationException("fulfillment_cannot_fail", "", null, languageCode);
        }

        const $set: Record<string, unknown> = {status: "failed"};
        if (notes !== undefined && writeFields.notes) {
            $set.notes = trimOptional(notes) || existing.notes;
        }

        await fulfillmentService.updateByIdOrThrow(existing._id, $set, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
        });

        return {message: "Fulfillment marked as failed"};
    }
}
