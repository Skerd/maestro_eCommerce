/**
 * Hourly job: auto-complete orders that have a submitted delivery and are past
 * the 3-day acceptance window without customer action.
 */

import { CronJob } from "cron";
import { CONSTANTS } from "@coreModule/environment";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import { orderService } from "@eCommerceMarketplaceModule/database/schemas/order/order.service";
import { orderDeliveryService } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import { disputeService } from "@eCommerceMarketplaceModule/database/schemas/dispute/dispute.service";
import { createEscrowReleaseAndFee } from "@eCommerceModule/utilities/escrowHelper";

const AUTO_ACCEPT_DAYS = 3;

let autoCompleteJob: CronJob | null = null;

export async function runOrderAutoComplete(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("order_auto_complete", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running order auto-complete job...");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - AUTO_ACCEPT_DAYS);

    try {
        // Find in_progress orders whose due date has passed
        const overdueOrders = await orderService.find(
            { status: "in_progress", deliveryDueDate: { $lte: cutoff } },
            { logger, languageCode: lang },
            null,
            "_id amount currency company",
            { deliveryDueDate: 1 },
            200,
            0
        );

        for (const order of overdueOrders) {
            try {
                // Check if there is a submitted delivery pending acceptance
                const submittedDelivery = await orderDeliveryService.findOne(
                    { order: order._id, status: "submitted" },
                    { logger, languageCode: lang }
                );

                if (!submittedDelivery) continue;

                // Skip orders with an active dispute — admin must resolve first
                const openDispute = await disputeService.findOne(
                    {order: order._id, status: {$in: ["open", "under_review"]}},
                    {logger, languageCode: lang},
                    null,
                    "_id",
                );
                if (openDispute) {
                    logger.debug(`Skipping auto-complete for order ${order._id.toString()} — open dispute exists`);
                    continue;
                }

                await orderDeliveryService.updateById(
                    submittedDelivery._id,
                    { $set: { status: "accepted" } },
                    { logger, languageCode: lang }
                );

                const amount = typeof (order as any).amount === "number"
                    ? (order as any).amount
                    : parseFloat(String((order as any).amount || 0));
                const currencyId = (order as any).currency;
                const companyId = (order as any).company;

                await createEscrowReleaseAndFee(order._id, amount, currencyId, companyId, {
                    logger,
                    languageCode: lang,
                });

                await orderService.updateById(
                    order._id,
                    { $set: { status: "completed" } },
                    { logger, languageCode: lang }
                );

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

export function startOrderAutoCompleteJob(parentLogger?: serverLogger): void {
    const log = getLogger("order_auto_complete_cron", parentLogger);
    if (autoCompleteJob !== null) return;
    autoCompleteJob = new CronJob(
        "0 0 * * * *",
        () => { void runOrderAutoComplete(parentLogger); },
        null,
        true,
        "UTC"
    );
    log.debug("Order auto-complete job scheduled (cron: 0 0 * * * * UTC — hourly)");
}

export function stopOrderAutoCompleteJob(): void {
    if (autoCompleteJob) {
        autoCompleteJob.stop();
        autoCompleteJob = null;
    }
}
