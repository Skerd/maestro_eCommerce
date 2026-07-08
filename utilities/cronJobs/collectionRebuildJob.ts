import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import Product from "@eCommerceModule/database/schemas/product/product";
import {buildProductFilterFromCollectionRules} from "@eCommerceModule/utilities/services/collectionRuleEngine";
import {CronJob} from "cron";

let collectionRebuildJob: CronJob | null = null;

export async function runCollectionRebuild(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("collection_rebuild", parentLogger);
    logger.start("Running dynamic collection rebuild job...");

    try {
        const dynamicCollections = await ProductCollection.find({
            type: "dynamic",
            isVisible: true,
            deletedAt: null,
        }).lean();
        logger.debug(`Found ${dynamicCollections.length} dynamic collections`);

        for (const collection of dynamicCollections) {
            try {
                const rules = (collection.rules as any[]) ?? [];
                if (!rules.length) continue;

                const mongoFilter = buildProductFilterFromCollectionRules(
                    collection.company,
                    rules,
                    collection.ruleCondition ?? "all",
                );

                const matchingProducts = await Product.find(mongoFilter, {_id: 1}).lean();
                const productIds = matchingProducts.map((p: any) => p._id);

                await ProductCollection.updateOne(
                    {_id: collection._id},
                    {$set: {products: productIds}},
                );

                logger.debug(`Rebuilt collection ${collection._id}: ${productIds.length} products`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                logger.err(`Failed to rebuild collection ${collection._id}: ${msg}`);
            }
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Collection rebuild job error: ${msg}`);
    }

    logger.finish("Finished dynamic collection rebuild job.");
}

export function startCollectionRebuildJob(parentLogger?: serverLogger): void {
    const log = getLogger("collection_rebuild_cron", parentLogger);
    if (collectionRebuildJob !== null) return;
    collectionRebuildJob = new CronJob(
        "0 0 */6 * * *",
        () => {
            void runCollectionRebuild(parentLogger);
        },
        null,
        true,
        "UTC",
    );
    log.debug("Collection rebuild job scheduled (every 6 hours UTC)");
}

export function stopCollectionRebuildJob(): void {
    if (collectionRebuildJob) {
        collectionRebuildJob.stop();
        collectionRebuildJob = null;
    }
}
