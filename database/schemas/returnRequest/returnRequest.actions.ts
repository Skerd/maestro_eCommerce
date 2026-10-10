import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {approveReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/approveReturnRequest.form.validator";
import {rejectReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/rejectReturnRequest.form.validator";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import ReturnRequestModel from "./returnRequest";
import {returnRequestService} from "./returnRequest.service";

function trimOptional(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const t = value.trim();
    return t.length ? t : undefined;
}

function assertStatusWrite(params: Record<string, any>) {
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

export class ReturnRequestActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: approveReturnRequestFormSchema,
        transaction: true,
    })
    async approve(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, refundAmount, notes} = params;

        const writeFields = assertStatusWrite(params);

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "pending") {
            throw apiValidationException("return_request_not_pending", "", null, languageCode);
        }

        const $set: Record<string, unknown> = {
            status: "approved",
            resolvedBy: actionUserCtx.userId,
            resolvedAt: new Date(),
        };

        if (refundAmount !== undefined && writeFields.refundAmount) {
            $set.refundAmount = Number(refundAmount);
        }
        if (notes !== undefined && writeFields.adminNote) {
            $set.adminNote = trimOptional(notes) || existing.adminNote;
        }

        await returnRequestService.updateByIdOrThrow(existing._id, $set, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
        });

        const orderId = nestedEntityToRef(existing.order);
        const order = orderId
            ? await productOrderService.findOne(
                {_id: orderId, company: company._id},
                {session, logger, languageCode},
            )
            : null;
        if (order) {
            await notifyProductOrderCustomer(NotificationEventCodes.RETURN_REQUEST_APPROVED, {
                companyId: company._id,
                languageCode,
                order,
                extra: {returnRequestId: existing._id.toString()},
            });
        }

        return {message: "Return request approved"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: rejectReturnRequestFormSchema,
        transaction: true,
    })
    async reject(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reason} = params;

        const writeFields = assertStatusWrite(params);

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "pending") {
            throw apiValidationException("return_request_not_pending", "", null, languageCode);
        }

        const $set: Record<string, unknown> = {
            status: "rejected",
            resolvedBy: actionUserCtx.userId,
            resolvedAt: new Date(),
        };

        if (reason !== undefined && writeFields.adminNote) {
            $set.adminNote = trimOptional(reason) || existing.adminNote;
        }

        await returnRequestService.updateByIdOrThrow(existing._id, $set, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
        });

        const orderId = nestedEntityToRef(existing.order);
        const order = orderId
            ? await productOrderService.findOne(
                {_id: orderId, company: company._id},
                {session, logger, languageCode},
            )
            : null;
        if (order) {
            await notifyProductOrderCustomer(NotificationEventCodes.RETURN_REQUEST_REJECTED, {
                companyId: company._id,
                languageCode,
                order,
                extra: {returnRequestId: existing._id.toString()},
            });
        }

        return {message: "Return request rejected"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async receive(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "approved") {
            throw apiValidationException("return_request_not_approved", "", null, languageCode);
        }

        await returnRequestService.updateByIdOrThrow(
            existing._id,
            {status: "received"},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Return request received"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async complete(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        assertStatusWrite(params);

        const existing = await returnRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (existing.status !== "received") {
            throw apiValidationException("return_request_not_received", "", null, languageCode);
        }

        await returnRequestService.updateByIdOrThrow(
            existing._id,
            {status: "completed"},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "Return request completed"};
    }
}
