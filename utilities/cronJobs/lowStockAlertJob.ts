import type {ObjectId} from "mongodb";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {CONSTANTS} from "@coreModule/environment";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {notifyMerchantsLowStock} from "@eCommerceModule/utilities/services/productOrderNotify";

export async function runLowStockAlert(company: ObjectId, parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("low_stock_alert", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running low stock alert job...");

    try {
        // Clear alert flag when stock recovered above reorder point
        await inventoryService.updateMany(
            {
                company,
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

        const lowStockItems = await inventoryService.find({
            company,
            lowStockAlertSent: {$ne: true},
            $expr: {
                $and: [
                    {$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]},
                    {$gte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]},
                    {$ne: ["$reorderPoint", null]},
                ],
            },
        }, {}, [{path: "product", select: "title sku"}, {path: "warehouse", select: "name code"}]);

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
                await inventoryService.updateOne({_id: item._id}, {$set: {lowStockAlertSent: true}});
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
