import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {UserContext} from "@coreModule/utilities/types/types";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {approveReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/approveReturnRequest.form.validator";
import type {ApproveReturnRequestFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/approveReturnRequest.form.validator";
import {rejectReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/rejectReturnRequest.form.validator";
import type {RejectReturnRequestFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/rejectReturnRequest.form.validator";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import ReturnRequestModel from "./returnRequest";
import {returnedItemsValue, returnRequestService} from "./returnRequest.service";
import type {IReturnRequest} from "./returnRequest";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {assertFieldWrite, refundProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder.actions";
import {trackedStockLines} from "@eCommerceModule/utilities/services/inventoryReservationService";

function blankToUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function assertStatusWrite(params: {languageCode: string; actionUserCtx: UserContext}) {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        ReturnRequestModel,
        getModelCollectedData("returnRequests").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.status) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
    return writeFields;
}

async function notifyOrder(
    orderRef: unknown,
    params: TransactionRequiredParams,
    code: string,
    returnRequestId: string,
) {
    const {session, logger, languageCode, company} = params;
    const orderId = nestedEntityToRef(orderRef);
    if (!orderId) {
        throw apiValidationException("order_not_found", "", null, languageCode);
    }
    const order = await productOrderService.findOneOrThrow(
        {_id: orderId, company: company._id},
        {session, logger, languageCode},
    );
    await notifyProductOrderCustomer(code, {
        companyId: company._id,
        languageCode,
        session,
        order,
        extra: {returnRequestId},
    });
}

async function loadOrder(orderRef: unknown, params: TransactionRequiredParams): Promise<IProductOrder> {
    const {session, logger, languageCode, company} = params;
    const orderId = nestedEntityToRef(orderRef);
    if (!orderId) {
        throw apiValidationException("order_not_found", "", null, languageCode);
    }
    return productOrderService.findOneOrThrow({_id: orderId, company: company._id}, {session, logger, languageCode});
}

/**
 * Puts returned goods back on hand, into the warehouse each item shipped
 * from (the order's consumed holds), with a `return` movement per row.
 * Bundles come back as their components. Items whose sale never took stock
 * (untracked products) or whose row is gone are noted on the order timeline
 * instead.
 */
async function restockReturnedItems(request: IReturnRequest, order: IProductOrder, params: TransactionRequiredParams): Promise<void> {
    const {session, logger, languageCode, company, actionUserCtx} = params;
    const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

    const lines = request.items.flatMap(item => {
        const line = order.items.find(orderLine => orderLine._id.toString() === item.orderItemId.toString());
        const productId = nestedEntityToRef(line?.product);
        return productId ? [{product: productId, variant: nestedEntityToRef(line?.variant), quantity: item.quantity}] : [];
    });
    const stockLines = await trackedStockLines(lines, company._id, ctx);

    const skipped: string[] = [];
    for (const line of stockLines) {
        const sold = order.reservations?.find(reservation =>
            reservation.state === "consumed"
            && nestedEntityToRef(reservation.product)?.equals(line.product)
            && String(nestedEntityToRef(reservation.variant) ?? "") === String(line.variant ?? ""));
        const warehouseId = nestedEntityToRef(sold?.warehouse);
        const updated = warehouseId
            ? await inventoryService.adjust(line.product, line.variant, warehouseId, line.quantity, ctx)
            : null;
        if (!warehouseId || !updated) {
            skipped.push(line.product.toString());
            continue;
        }
        await inventoryMovementService.create(
            {
                inventory: updated._id,
                product: line.product,
                variant: line.variant,
                warehouse: warehouseId,
                quantity: line.quantity,
                reason: "return",
                quantityBefore: updated.quantityOnHand - line.quantity,
                quantityAfter: updated.quantityOnHand,
                performedBy: new ObjectId(actionUserCtx.userId),
                referenceType: "ReturnRequest",
                referenceId: request._id,
                company: company._id,
            },
            ctx,
        );
    }

    if (skipped.length) {
        logger.warn(`Return ${request._id}: no sold stock to put back for ${skipped.join(", ")}`);
        await productOrderService.updateByIdOrThrow(
            order._id,
            {$push: {timeline: {event: "return_restock_skipped", timestamp: new Date(), userId: actionUserCtx.userId, note: skipped.join(", ")}}},
            ctx,
        );
    }
}

export class ReturnRequestActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: approveReturnRequestFormSchema,
        transaction: true,
    })
    async approve(params: TransactionRequiredParams & ApproveReturnRequestFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, refundAmount, notes} = params;
        const writeFields = assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "pending") {
            throw apiValidationException("return_request_not_pending", "", null, languageCode);
        }

        const update: {
            status: "approved";
            resolvedBy: ObjectId;
            resolvedAt: Date;
            refundAmount?: number;
            adminNote?: string;
        } = {
            status: "approved",
            resolvedBy: new ObjectId(actionUserCtx.userId),
            resolvedAt: new Date(),
        };

        if (refundAmount !== undefined && writeFields.refundAmount) {
            const order = await loadOrder(existing.order, params);
            if (refundAmount > returnedItemsValue(order, existing.items)) {
                throw apiValidationException("return_refund_exceeds_items", "refundAmount", null, languageCode);
            }
            update.refundAmount = refundAmount;
        }
        if (notes !== undefined && writeFields.adminNote) {
            const trimmed = blankToUndefined(notes);
            if (trimmed) update.adminNote = trimmed;
        }

        await returnRequestService.updateByIdOrThrow(existing._id, update, ctx);
        await notifyOrder(existing.order, params, NotificationEventCodes.RETURN_REQUEST_APPROVED, existing._id.toString());

        return {message: "Return request approved"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: rejectReturnRequestFormSchema,
        transaction: true,
    })
    async reject(params: TransactionRequiredParams & RejectReturnRequestFormType): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reason} = params;
        const writeFields = assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "pending") {
            throw apiValidationException("return_request_not_pending", "", null, languageCode);
        }

        const update: {
            status: "rejected";
            resolvedBy: ObjectId;
            resolvedAt: Date;
            adminNote?: string;
        } = {
            status: "rejected",
            resolvedBy: new ObjectId(actionUserCtx.userId),
            resolvedAt: new Date(),
        };

        if (reason !== undefined && writeFields.adminNote) {
            const trimmed = blankToUndefined(reason);
            if (trimmed) update.adminNote = trimmed;
        }

        await returnRequestService.updateByIdOrThrow(existing._id, update, ctx);
        await notifyOrder(existing.order, params, NotificationEventCodes.RETURN_REQUEST_REJECTED, existing._id.toString());

        return {message: "Return request rejected"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async receive(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "approved") {
            throw apiValidationException("return_request_not_approved", "", null, languageCode);
        }

        // Goods come back for returns and exchanges; a refund-only request has nothing to receive
        if (existing.type !== "refund") {
            await restockReturnedItems(existing, await loadOrder(existing.order, params), params);
        }

        await returnRequestService.updateByIdOrThrow(existing._id, {status: "received"}, ctx);

        return {message: "Return request received"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async complete(params: TransactionRequiredParams & {_id: string}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            ctx,
        );

        if (existing.status !== "received") {
            throw apiValidationException("return_request_not_received", "", null, languageCode);
        }

        // Returns and refund requests pay back the agreed amount through the order's refund; exchanges don't
        if (existing.type !== "exchange" && (existing.refundAmount ?? 0) > 0) {
            assertFieldWrite(params, "paymentStatus");
            const order = await loadOrder(existing.order, params);
            await refundProductOrder(order, {amount: existing.refundAmount, reason: `Return request ${existing._id}`}, params);
        }

        await returnRequestService.updateByIdOrThrow(existing._id, {status: "completed"}, ctx);

        return {message: "Return request completed"};
    }
}
