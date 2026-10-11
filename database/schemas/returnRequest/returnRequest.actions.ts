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
import {returnRequestService} from "./returnRequest.service";

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
        order,
        extra: {returnRequestId},
    });
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

        await returnRequestService.updateByIdOrThrow(existing._id, {status: "completed"}, ctx);

        return {message: "Return request completed"};
    }
}
