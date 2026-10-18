/**
 * Shared order-delivery completion + escrow release path.
 * Used by OrderActions.acceptDelivery and the auto-complete cron.
 */

import {ObjectId} from "mongodb";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {providerProfileService} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.service";
import {createEscrowReleaseAndFee} from "@financeModule/utilities/escrowHelper";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import type {serverLogger} from "@coreModule/loggers/serverLog";

type CompletionOptions = {
    session?: any;
    logger: serverLogger;
    languageCode: string;
    auditUserId?: string | ObjectId;
    /** When false, skip ORDER_DELIVERY_ACCEPTED notification (e.g. system auto-complete). Default true. */
    notifyProvider?: boolean;
};

/**
 * Marks a submitted delivery accepted, completes the order, and releases escrow
 * with the provider's Connect account when available.
 */
export async function completeSubmittedDeliveryAndRelease(
    order: any,
    delivery: {_id: ObjectId},
    options: CompletionOptions,
): Promise<void> {
    const {session, logger, languageCode, auditUserId, notifyProvider = true} = options;
    const writeOpts = {session, logger, languageCode, auditUserId};

    await orderDeliveryService.updateByIdOrThrow(
        delivery._id,
        {$set: {status: "accepted"}},
        writeOpts,
    );

    await orderService.updateByIdOrThrow(
        order._id,
        {$set: {status: "completed"}},
        writeOpts,
    );

    const orderAmount = typeof order.amount === "number"
        ? order.amount
        : parseFloat(String(order.amount || 0));
    const currencyId = order.currency?._id || order.currency;
    const companyId = order.company?._id || order.company;
    const releaseProviderId = order.provider?._id || order.provider;

    if (orderAmount > 0 && currencyId && companyId) {
        const providerStripeAccountId = releaseProviderId
            ? await providerProfileService.getPayoutAccountId(releaseProviderId, companyId, {
                session,
                logger,
                languageCode,
            })
            : undefined;
        await createEscrowReleaseAndFee(
            order._id,
            orderAmount,
            currencyId,
            companyId,
            writeOpts,
            {providerStripeAccountId},
        );
    }

    if (!notifyProvider) {
        return;
    }

    const providerIdStr = releaseProviderId?.toString?.() ?? "";
    if (providerIdStr) {
        emitNotificationEvent(NotificationEventCodes.ORDER_DELIVERY_ACCEPTED, {
            receiverIds: [providerIdStr],
            payload: {
                companyId: companyId?.toString?.() ?? "",
                languageCode,
                orderId: order._id.toString(),
                orderName: order.name ?? "",
            },
        });
    }
}
