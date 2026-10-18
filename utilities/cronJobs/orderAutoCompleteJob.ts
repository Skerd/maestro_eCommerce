/**
 * Hourly job: auto-complete orders that have a submitted delivery and are past
 * the acceptance window without customer action.
 */

import {CONSTANTS} from "@coreModule/environment";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {disputeService} from "@eCommerceModule/database/schemas/dispute/dispute.service";
import {completeSubmittedDeliveryAndRelease} from "@eCommerceModule/database/schemas/order/orderDeliveryCompletion";
import {getECommerceMarketplaceConfig} from "@eCommerceModule/utilities/config";

export async function runOrderAutoComplete(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("order_auto_complete", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";
    const {autoAcceptDays} = getECommerceMarketplaceConfig();

    logger.start("Running order auto-complete job...");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - autoAcceptDays);

    try {
        const overdueOrders = await orderService.find(
            {status: "in_progress", deliveryDueDate: {$lte: cutoff}},
            {logger, languageCode: lang},
            null,
            "_id amount currency company provider name status",
            {deliveryDueDate: 1},
            200,
            0,
        );

        for (const order of overdueOrders) {
            try {
                const companyId = (order as any).company?._id ?? (order as any).company;
                const submittedDelivery = await orderDeliveryService.findOne(
                    {order: order._id, status: "submitted", company: companyId},
                    {logger, languageCode: lang},
                    null,
                    "_id status",
                );

                if (!submittedDelivery) continue;

                const openDispute = await disputeService.findOne(
                    {order: order._id, status: {$in: ["open", "under_review"]}, company: companyId},
                    {logger, languageCode: lang},
                    null,
                    "_id",
                );
                if (openDispute) {
                    logger.debug(`Skipping auto-complete for order ${order._id.toString()} — open dispute exists`);
                    continue;
                }

                await completeSubmittedDeliveryAndRelease(order, submittedDelivery, {
                    logger,
                    languageCode: lang,
                    notifyProvider: true,
                });

                logger.debug(`Auto-completed order ${order._id.toString()}`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                logger.err(`Auto-complete failed for order ${order._id?.toString?.()}: ${msg}`);
            }
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Order auto-complete job error: ${msg}`);
    }

    logger.finish("Finished order auto-complete job.");
}
