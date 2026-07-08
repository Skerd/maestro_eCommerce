import {CronJob} from "cron";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";

let scheduledPublishJob: CronJob | null = null;

export async function runScheduledPublish(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("scheduled_publish", parentLogger);
    logger.start("Running scheduled publish job...");

    const now = new Date();

    try {
        const [productResult, collectionResult] = await Promise.all([
            Product.updateMany(
                {status: "draft", publishedAt: {$lte: now, $ne: null}, deletedAt: null},
                {$set: {status: "active"}},
            ),
            ProductCollection.updateMany(
                {isVisible: false, publishedAt: {$lte: now, $ne: null}, deletedAt: null},
                {$set: {isVisible: true}},
            ),
        ]);

        logger.debug(`Published ${productResult.modifiedCount} products, ${collectionResult.modifiedCount} collections`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Scheduled publish job error: ${msg}`);
    }

    logger.finish("Finished scheduled publish job.");
}

export function startScheduledPublishJob(parentLogger?: serverLogger): void {
    const log = getLogger("scheduled_publish_cron", parentLogger);
    if (scheduledPublishJob !== null) return;
    scheduledPublishJob = new CronJob(
        "0 */5 * * * *",
        () => {
            void runScheduledPublish(parentLogger);
        },
        null,
        true,
        "UTC",
    );
    log.debug("Scheduled publish job scheduled (every 5 minutes)");
}

export function stopScheduledPublishJob(): void {
    if (scheduledPublishJob) {
        scheduledPublishJob.stop();
        scheduledPublishJob = null;
    }
}
