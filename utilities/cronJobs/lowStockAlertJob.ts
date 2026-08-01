import {CronJob} from "cron";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {CONSTANTS} from "@coreModule/environment";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {notifyMerchantsLowStock} from "@eCommerceModule/utilities/services/productOrderNotify";

let lowStockJob: CronJob | null = null;

export async function runLowStockAlert(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("low_stock_alert", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running low stock alert job...");

    try {
        // Clear alert flag when stock recovered above reorder point
        await Inventory.updateMany(
            {
                lowStockAlertSent: true,
                $expr: {
                    $and: [
                        {$ne: ["$reorderPoint", null]},
                        {$gte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]},
                    ],
                },
            },
            {$set: {lowStockAlertSent: false}},
        );

        const lowStockItems = await Inventory.find({
            lowStockAlertSent: {$ne: true},
            $expr: {
                $and: [
                    {$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]},
                    {$gte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]},
                    {$ne: ["$reorderPoint", null]},
                ],
            },
        })
            .populate("product", "title sku")
            .populate("warehouse", "name code")
            .lean();

        logger.debug(`Found ${lowStockItems.length} low stock items`);

        let notified = 0;
        for (const item of lowStockItems) {
            const available = item.quantityOnHand - item.quantityReserved;
            const productTitle = (item.product as any)?.title ?? item.product?.toString();
            const warehouseName = (item.warehouse as any)?.name ?? item.warehouse?.toString();
            const companyId = ((item.company as any)?._id ?? item.company)?.toString?.();
            if (!companyId) continue;

            try {
                await notifyMerchantsLowStock({
                    companyId,
                    languageCode: lang,
                    inventoryId: item._id.toString(),
                    productTitle: String(productTitle ?? "product"),
                    warehouseName: String(warehouseName ?? "warehouse"),
                    availableQuantity: available,
                    reorderPoint: item.reorderPoint ?? 0,
                });
                await Inventory.updateOne({_id: item._id}, {$set: {lowStockAlertSent: true}});
                notified += 1;
            } catch (e: any) {
                logger.err(`Low stock notify failed for inventory ${item._id}`, e);
            }
        }

        logger.finish(`Low stock alert finished: ${notified}/${lowStockItems.length} alerts sent.`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Low stock alert job error: ${msg}`);
        logger.finish("Finished low stock alert job with errors.");
    }
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
