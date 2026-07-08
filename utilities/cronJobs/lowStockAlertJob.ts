import {CronJob} from "cron";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {CONSTANTS} from "@coreModule/environment";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";

let lowStockJob: CronJob | null = null;

export async function runLowStockAlert(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("low_stock_alert", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running low stock alert job...");

    try {
        const lowStockItems = await Inventory.find({
            $expr: {
                $and: [
                    {$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]},
                    {$gt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]},
                    {$ne: ["$reorderPoint", null]},
                ],
            },
        })
            .populate("product", "title sku")
            .populate("warehouse", "name code")
            .lean();

        logger.debug(`Found ${lowStockItems.length} low stock items`);

        for (const item of lowStockItems) {
            const available = item.quantityOnHand - item.quantityReserved;
            const productTitle = (item.product as any)?.title ?? item.product?.toString();
            const warehouseName = (item.warehouse as any)?.name ?? item.warehouse?.toString();
            logger.debug(`Low stock: ${productTitle} @ ${warehouseName} — ${available} available (reorder at ${item.reorderPoint})`);
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Low stock alert job error: ${msg}`);
    }

    logger.finish("Finished low stock alert job.");
}

export function startLowStockAlertJob(parentLogger?: serverLogger): void {
    const log = getLogger("low_stock_alert_cron", parentLogger);
    if (lowStockJob !== null) return;
    lowStockJob = new CronJob(
        "0 0 8 * * *",
        () => {
            void runLowStockAlert(parentLogger);
        },
        null,
        true,
        "UTC",
    );
    log.debug("Low stock alert job scheduled (daily at 08:00 UTC)");
}

export function stopLowStockAlertJob(): void {
    if (lowStockJob) {
        lowStockJob.stop();
        lowStockJob = null;
    }
}
