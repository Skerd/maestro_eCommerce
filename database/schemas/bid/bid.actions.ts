import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {bidService} from "@eCommerceModule/database/schemas/bid/bid.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {taskRequestService} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.service";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {ActionMessage} from "armonia/src/modules/core/types/shared.types";

export class BidActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: validateSingleForm,
    })
    async accept(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Accepting bid: ${_id}...`);

        const bid = await bidService.findOne(
            {
                _id: new ObjectId(_id),
                status: "pending",
                company: company._id,
            },
            {session, logger, languageCode}
        )

        if (!bid) {
            throw apiValidationException("bid_not_found_or_already_processed", null, null, languageCode);
        }

        await bidService.updateByIdOrThrow(bid._id, {$set: {status: "accepted"}}, {session, logger, languageCode, auditUserId: actionUserCtx.userId},);

        const taskRequest = await taskRequestService.findOneOrThrow(
            {_id: bid.taskRequest._id, company: company._id},
            {session, logger, languageCode},
        );

        if (taskRequest.requester._id?.toString() !== actionUserCtx.userId?.toString() && !actionUserCtx.isAdmin) {
            throw apiValidationException("only_requester_can_accept", null, null, languageCode);
        }

        if (taskRequest.status !== "open") {
            throw apiValidationException("task_already_awarded_or_closed", null, null, languageCode);
        }

        await taskRequestService.updateById(
            taskRequest._id,
            {$set: {status: "awarded"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const otherBidders = await bidService.aggregate(
            [
                {$match: {taskRequest: taskRequest._id, status: "pending", company: company._id, _id: {$ne: bid._id}}},
                {$group: {_id: "$bidder"}},
            ],
            {logger, languageCode},
        );
        const otherBidderIds = otherBidders.map((b: any) => b._id?.toString()).filter(Boolean) as string[];

        await bidService.updateMany(
            {
                taskRequest: taskRequest._id,
                status: "pending",
                company: company._id,
                _id: {
                    $ne: bid._id
                }
            },
            {
                $set: {
                    status: "rejected",
                }
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId}
        )

        const bidDeliveryDays = (bid as any).deliveryDays;
        const deliveryDueDate = typeof bidDeliveryDays === "number" && bidDeliveryDays > 0
            ? new Date(Date.now() + bidDeliveryDays * 24 * 60 * 60 * 1000)
            : undefined;

        await orderService.create(
            {
                taskRequest: taskRequest._id,
                bid: bid._id,
                customer: taskRequest.requester,
                provider: bid.bidder,
                amount: bid.amount,
                currency: bid.currency,
                status: "pending",
                company: company._id,
                ...(deliveryDueDate ? {deliveryDueDate} : {}),
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const companyId = company._id.toString();
        const taskRequestTitle = (taskRequest.title as string) ?? "";
        const taskRequestId = taskRequest._id.toString();
        const bidderId = (bid.bidder as any)?._id?.toString() ?? bid.bidder?.toString();

        if (bidderId) {
            emitNotificationEvent(NotificationEventCodes.BID_ACCEPTED, {
                receiverIds: [bidderId],
                payload: {companyId, languageCode, bidId: bid._id.toString(), taskRequestId, taskRequestTitle},
            });
        }
        if (otherBidderIds.length > 0) {
            emitNotificationEvent(NotificationEventCodes.BID_REJECTED, {
                receiverIds: otherBidderIds,
                payload: {companyId, languageCode, bidId: bid._id.toString(), taskRequestId, taskRequestTitle},
            });
        }

        logger.finish(`Successfully accepted bid: ${_id}`);

        return {message: "Bid accepted successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: validateSingleForm,
    })
    async reject(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Rejecting bid: ${_id}...`);

        const bid = await bidService.findOne(
            {
                _id: new ObjectId(_id),
                status: "pending",
                company: company._id,
            },
            {session, logger, languageCode}
        )

        if (!bid) {
            throw apiValidationException("bid_not_found_or_already_processed", null, null, languageCode);
        }

        await bidService.updateByIdOrThrow(bid._id, {$set: {status: "rejected"}}, {session, logger, languageCode, auditUserId: actionUserCtx.userId});

        const taskRequest = await taskRequestService.findOneOrThrow(
            {
                _id: bid.taskRequest._id,
                company: company._id
            },
            {session, logger, languageCode},
        );

        if (taskRequest.requester._id?.toString() !== actionUserCtx.userId?.toString() && !actionUserCtx.isAdmin) {
            throw apiValidationException("only_requester_or_bidder_can_reject", null, null, languageCode);
        }

        const bidderId = (bid.bidder as any)?._id?.toString() ?? bid.bidder?.toString();
        if (bidderId) {
            emitNotificationEvent(NotificationEventCodes.BID_REJECTED, {
                receiverIds: [bidderId],
                payload: {
                    companyId: company._id.toString(),
                    languageCode,
                    bidId: bid._id.toString(),
                    taskRequestId: bid.taskRequest._id?.toString() ?? bid.taskRequest?.toString(),
                    taskRequestTitle: (bid.taskRequest as any)?.title ?? "",
                },
            });
        }

        logger.finish(`Successfully rejected bid: ${_id}`);

        return {message: "Bid rejected successfully"};
    }
}
