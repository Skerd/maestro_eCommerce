import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {resolveDisputeActionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/dispute/resolveDispute.action.validator";
import {apiValidationException, DEFAULT_EXCEPTION_LANGUAGE} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {disputeService} from "@eCommerceModule/database/schemas/dispute/dispute.service";
import {providerProfileService} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.service";
import {createEscrowRefund, createEscrowReleaseAndFee} from "@financeModule/utilities/escrowHelper";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";

function ensureAdmin(actionUserCtx: Record<string, any>, languageCode: string | undefined): void {
    if (!actionUserCtx.isAdmin) {
        throw apiValidationException("only_admin_can_update_dispute", null, null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
    }
}

function parseOrderRefs(order: any): {orderAmount: number; currencyId: unknown; companyId: unknown} {
    const orderAmount =
        typeof order.amount === "number" ? order.amount : parseFloat(String(order.amount || 0));
    const currencyId = order.currency?._id || order.currency;
    const companyId = order.company?._id || order.company;
    return {orderAmount, currencyId, companyId};
}

async function resolveOrderCompletingEscrow(order: any, params: Record<string, any>): Promise<void> {
    const {session, logger, languageCode, actionUserCtx, company} = params;

    const currentStatus = order.status;

    const delivery =
        currentStatus === "in_progress"
            ? await orderDeliveryService.findOne(
                  {order: order._id, status: "submitted", company: company._id},
                  {session, logger, languageCode},
                  null,
                  "_id status",
              )
            : null;

    if (delivery) {
        await orderDeliveryService.updateByIdOrThrow(
            delivery._id,
            {$set: {status: "accepted"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
    }

    await orderService.updateByIdOrThrow(
        order._id,
        {$set: {status: "completed"}},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    const {orderAmount, currencyId, companyId} = parseOrderRefs(order);
    const hadEscrowEligibleStatus = delivery || ["accepted", "in_progress"].includes(currentStatus);
    if (orderAmount > 0 && currencyId && companyId && hadEscrowEligibleStatus) {
        const disputeProviderId = order.provider?._id || order.provider;
        const providerStripeAccountId = disputeProviderId
            ? await providerProfileService.getPayoutAccountId(disputeProviderId, companyId as ObjectId, {session, logger, languageCode})
            : undefined;
        await createEscrowReleaseAndFee(
            order._id,
            orderAmount,
            currencyId as ObjectId,
            companyId as ObjectId,
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
            {providerStripeAccountId},
        );
    }

    if (delivery) {
        const providerId = order.provider?._id || order.provider;
        const providerIdStr = providerId?.toString?.() ?? "";
        if (providerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_DELIVERY_ACCEPTED, {
                receiverIds: [providerIdStr],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: order.name ?? "",
                },
            });
        }
    }
}

async function closeOrderRefundEscrow(order: any, params: Record<string, any>): Promise<void> {
    const {session, logger, languageCode, actionUserCtx} = params;

    const currentStatus = order.status;

    if (currentStatus === "completed" || currentStatus === "cancelled") {
        return;
    }

    await orderService.updateByIdOrThrow(
        order._id,
        {$set: {status: "cancelled"}},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    const {orderAmount, currencyId, companyId} = parseOrderRefs(order);

    if (["accepted", "in_progress"].includes(currentStatus) && orderAmount > 0 && currencyId && companyId) {
        await createEscrowRefund(
            order._id,
            orderAmount,
            currencyId as ObjectId,
            companyId as ObjectId,
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
    }
}

export class DisputeActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async startReview(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Marking dispute under review: ${_id}...`);
        ensureAdmin(actionUserCtx, languageCode);

        const dispute = await disputeService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (dispute.deletedAt) {
            throw apiValidationException("dispute_deleted", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        if (dispute.status !== "open") {
            throw apiValidationException(
                "dispute_start_review_requires_open_status",
                null,
                null,
                languageCode ?? DEFAULT_EXCEPTION_LANGUAGE,
            );
        }

        await disputeService.updateByIdOrThrow(
            dispute._id,
            {$set: {status: "under_review"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Dispute under review: ${_id}`);
        return {message: "Dispute marked as under review"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: resolveDisputeActionFormSchema,
    })
    async resolve(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, resolution} = params;

        logger.start(`Resolving dispute: ${_id}...`);
        ensureAdmin(actionUserCtx, languageCode);

        const dispute = await disputeService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
            "order",
            "_id status reason resolution order company deletedAt deletedBy",
        );

        if (dispute.deletedAt) {
            throw apiValidationException("dispute_deleted", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        const st = dispute.status as string;
        if (st !== "open" && st !== "under_review") {
            throw apiValidationException(
                "dispute_cannot_resolve_in_current_status",
                null,
                null,
                languageCode ?? DEFAULT_EXCEPTION_LANGUAGE,
            );
        }

        const resolutionText = typeof resolution === "string" ? resolution.trim() : "";
        if (!resolutionText) {
            throw apiValidationException("validation_required", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await disputeService.updateByIdOrThrow(
            dispute._id,
            {$set: {status: "resolved", resolution: resolutionText}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const orderId = dispute.order?._id ?? dispute.order;
        if (!orderId) {
            logger.finish(`Resolved dispute ${_id} (no linked order)`);
            return {message: "Dispute resolved"};
        }

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(String(orderId)), company: company._id},
            {session, logger, languageCode},
            "currency",
            "_id amount currency company status customer provider name",
        );

        await resolveOrderCompletingEscrow(order, params);

        logger.finish(`Resolved dispute ${_id}`);
        return {message: "Dispute resolved"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: resolveDisputeActionFormSchema,
    })
    async close(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, resolution} = params;

        logger.start(`Closing dispute: ${_id}...`);
        ensureAdmin(actionUserCtx, languageCode);

        const dispute = await disputeService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
            "order",
            "_id status reason resolution order deletedAt deletedBy company",
        );

        if (dispute.deletedAt) {
            throw apiValidationException("dispute_deleted", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        const st = dispute.status as string;
        if (st !== "open" && st !== "under_review") {
            throw apiValidationException(
                "dispute_cannot_close_in_current_status",
                null,
                null,
                languageCode ?? DEFAULT_EXCEPTION_LANGUAGE,
            );
        }

        const resolutionText = typeof resolution === "string" ? resolution.trim() : "";
        if (!resolutionText) {
            throw apiValidationException("validation_required", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await disputeService.updateByIdOrThrow(
            dispute._id,
            {$set: {status: "closed", resolution: resolutionText}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const orderId = dispute.order?._id ?? dispute.order;
        if (!orderId) {
            logger.finish(`Closed dispute ${_id} (no linked order)`);
            return {message: "Dispute closed"};
        }

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(String(orderId)), company: company._id},
            {session, logger, languageCode},
            "currency",
            "_id amount currency company status customer provider name",
        );

        await closeOrderRefundEscrow(order, params);

        logger.finish(`Closed dispute ${_id}`);
        return {message: "Dispute closed"};
    }
}
