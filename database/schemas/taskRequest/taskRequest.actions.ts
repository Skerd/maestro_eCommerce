import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {apiValidationException, DEFAULT_EXCEPTION_LANGUAGE} from "armonia/src/modules/core/helpers/exceptions";
import {UserContext} from "@coreModule/utilities/types/types";
import {ITaskRequest} from "@eCommerceModule/database/schemas/taskRequest/taskRequest";
import {taskRequestService} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.service";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {bidService} from "@eCommerceModule/database/schemas/bid/bid.service";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";

function assertMayChangeTaskRequestStatus(doc: ITaskRequest, actionUserCtx: UserContext, languageCode: string | undefined = DEFAULT_EXCEPTION_LANGUAGE): void {
    if (doc.status === "awarded") {
        throw apiValidationException("task_request_awarded_no_status_change", "", null, languageCode);
    }
    if (!actionUserCtx.isAdmin && doc.requester?._id?.toString() !== actionUserCtx.userId) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

export class TaskRequestActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async close(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;

        logger.start(`Closing task request: ${_id}...`);

        const doc = await taskRequestService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, {session, logger, languageCode}, null, "status requester");

        assertMayChangeTaskRequestStatus(doc, actionUserCtx, languageCode);

        if (doc.status === "open") {
            await taskRequestService.updateByIdOrThrow(new ObjectId(_id), {status: "closed"}, {session, logger, languageCode, auditUserId: actionUserCtx.userId});

            const bids = await bidService.aggregate(
                [{$match: {taskRequest: doc._id, status: "pending", company: company._id}}, {$group: {_id: "$bidder"}}],
                {logger, languageCode},
            );
            const pendingBidders = bids.map((b: any) => b._id?.toString()).filter(Boolean) as string[];

            if (pendingBidders.length > 0) {
                emitNotificationEvent(NotificationEventCodes.TASK_REQUEST_CLOSED, {
                    receiverIds: pendingBidders,
                    payload: {
                        companyId: company._id.toString(),
                        languageCode,
                        taskRequestId: doc._id.toString(),
                        taskRequestTitle: doc.title,
                    },
                });
            }
        }

        logger.finish(`Finished closing task request: ${_id}`);
        return {message: "Finished closing task request"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async reopen(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;

        logger.start(`Reopening task request: ${_id}...`);

        const doc = await taskRequestService.findOneOrThrow({_id: new ObjectId(_id), company: company._id}, {session, logger, languageCode}, null, "status requester");

        assertMayChangeTaskRequestStatus(doc, actionUserCtx, languageCode);

        if (doc.status === "closed") {
            await taskRequestService.updateByIdOrThrow(new ObjectId(_id), {status: "open"}, {session, logger, languageCode, auditUserId: actionUserCtx.userId});
        }

        logger.finish(`Finished reopening task request: ${_id}`);
        return {message: "Finished reopening task request"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: false,
        schema: validateSingleForm,
    })
    async notifyAll(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, _id} = params;

        logger.start(`Notifying providers for task request: ${_id}...`);

        const doc = await taskRequestService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {logger, languageCode},
            null,
            "title category address requester status",
        );

        if (!actionUserCtx.isAdmin && doc.requester?._id?.toString() !== actionUserCtx.userId) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        if (!doc.category || !doc.address?.city) {
            logger.finish(`Task request ${_id} has no category or city — skipping notifications`);
            return {message: "No providers to notify"};
        }

        const providers = await listingService.aggregate(
            [
                {$match: {company: company._id, category: doc.category, "address.city": doc.address.city, status: "active", deletedAt: {$exists: false}}},
                {$group: {_id: "$provider"}},
            ],
            {logger, languageCode},
        );

        const providerIds = providers.map((p: any) => p._id?.toString()).filter(Boolean) as string[];

        if (providerIds.length > 0) {
            emitNotificationEvent(NotificationEventCodes.TASK_REQUEST_CREATED, {
                receiverIds: providerIds,
                payload: {
                    companyId: company._id.toString(),
                    languageCode,
                    taskRequestId: doc._id.toString(),
                    taskRequestTitle: doc.title,
                    categoryId: doc.category.toString(),
                    cityId: doc.address.city.toString(),
                },
            });
        }

        logger.finish(`Finished notifying ${providerIds.length} provider(s) for task request: ${_id}`);
        return {message: `Notified ${providerIds.length} provider(s)`};
    }
}
