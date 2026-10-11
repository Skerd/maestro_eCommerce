import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {UserContext} from "@coreModule/utilities/types/types";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import type {ProductOrderStatus} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.schema-def";
import {shipFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/shipFulfillment.form.validator";
import type {ShipFulfillmentFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/shipFulfillment.form.validator";
import {fulfillmentStatusNotesFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillmentStatusNotes.form.validator";
import type {FulfillmentStatusNotesFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillmentStatusNotes.form.validator";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import FulfillmentModel, {type IFulfillment} from "./fulfillment";
import {fulfillmentService} from "./fulfillment.service";

const NOT_READY_TO_SHIP: ProductOrderStatus[] = ["pending", "cancelled", "refunded"];
const SHIP_ADVANCES_ORDER: ProductOrderStatus[] = ["confirmed", "processing"];
const DELIVER_ADVANCES_ORDER: ProductOrderStatus[] = ["confirmed", "processing", "shipped"];

function blankToUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function assertStatusWrite(params: {languageCode: string; actionUserCtx: UserContext}) {
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

async function loadOrderForFulfillment(fulfillment: IFulfillment, params: TransactionRequiredParams) {
    const {session, logger, languageCode, company} = params;
    const orderId = nestedEntityToRef(fulfillment.order);
    if (!orderId) {
        throw apiValidationException("order_not_found", "", null, languageCode);
    }
    return productOrderService.findOneOrThrow(
        {_id: orderId, company: company._id},
        {session, logger, languageCode},
    );
}

export class FulfillmentActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: shipFulfillmentFormSchema,
        transaction: true,
    })
    async ship(params: TransactionRequiredParams & ShipFulfillmentFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, carrier, trackingNumber, trackingUrl, notes} = params;
        const writeFields = assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await fulfillmentService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "pending") {
            throw apiValidationException("fulfillment_not_pending", "", null, languageCode);
        }

        const order = await loadOrderForFulfillment(existing, params);
        if (NOT_READY_TO_SHIP.includes(order.status)) {
            throw apiValidationException("order_not_ready_to_ship", "", null, languageCode);
        }

        const update: {
            status: "shipped";
            shippedAt: Date;
            trackingNumber?: string;
            carrier?: string;
            trackingUrl?: string;
            notes?: string;
        } = {
            status: "shipped",
            shippedAt: new Date(),
        };

        if (trackingNumber !== undefined && writeFields.trackingNumber) {
            update.trackingNumber = blankToUndefined(trackingNumber);
        }
        if (carrier !== undefined && writeFields.carrier) {
            update.carrier = blankToUndefined(carrier);
        }
        if (trackingUrl !== undefined && writeFields.trackingUrl) {
            update.trackingUrl = blankToUndefined(trackingUrl);
        }
        if (notes !== undefined && writeFields.notes) {
            const trimmed = blankToUndefined(notes);
            if (trimmed) update.notes = trimmed;
        }

        await fulfillmentService.updateByIdOrThrow(existing._id, update, ctx);

        if (SHIP_ADVANCES_ORDER.includes(order.status)) {
            await productOrderService.updateByIdOrThrow(
                order._id,
                {
                    $set: {status: "shipped", fulfillmentStatus: "fulfilled"},
                    $push: {
                        timeline: {
                            event: "order_shipped",
                            timestamp: new Date(),
                            userId: actionUserCtx.userId,
                            note: update.trackingNumber,
                        },
                    },
                },
                ctx,
            );
        }

        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_SHIPPED, {
            companyId: company._id,
            languageCode,
            order,
            extra: {
                trackingNumber: update.trackingNumber ?? existing.trackingNumber ?? "",
                trackingUrl: update.trackingUrl ?? existing.trackingUrl ?? "",
                carrier: update.carrier ?? existing.carrier ?? "",
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
    async markDelivered(params: TransactionRequiredParams & FulfillmentStatusNotesFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, notes} = params;
        const writeFields = assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await fulfillmentService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "shipped") {
            throw apiValidationException("fulfillment_not_shipped", "", null, languageCode);
        }

        const update: {status: "delivered"; deliveredAt: Date; notes?: string} = {
            status: "delivered",
            deliveredAt: new Date(),
        };
        if (notes !== undefined && writeFields.notes) {
            const trimmed = blankToUndefined(notes);
            if (trimmed) update.notes = trimmed;
        }

        await fulfillmentService.updateByIdOrThrow(existing._id, update, ctx);

        const order = await loadOrderForFulfillment(existing, params);
        if (DELIVER_ADVANCES_ORDER.includes(order.status)) {
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
                ctx,
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
    async markFailed(params: TransactionRequiredParams & FulfillmentStatusNotesFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, notes} = params;
        const writeFields = assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await fulfillmentService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "pending" && existing.status !== "shipped") {
            throw apiValidationException("fulfillment_cannot_fail", "", null, languageCode);
        }

        const update: {status: "failed"; notes?: string} = {status: "failed"};
        if (notes !== undefined && writeFields.notes) {
            const trimmed = blankToUndefined(notes);
            if (trimmed) update.notes = trimmed;
        }

        await fulfillmentService.updateByIdOrThrow(existing._id, update, ctx);

        return {message: "Fulfillment marked as failed"};
    }
}
