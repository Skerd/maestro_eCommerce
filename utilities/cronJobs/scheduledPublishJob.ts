import type {ObjectId} from "mongodb";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import Product from "@eCommerceModule/database/schemas/product/product";

export async function runScheduledPublish(company: ObjectId, parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("scheduled_publish", parentLogger);
    logger.start("Running scheduled publish job...");

    const now = new Date();

    try {
        const productResult = await Product.updateMany(
            {
                company,
                status: "draft",
                publishedAt: {$lte: now, $ne: null},
                // Same rule as assertPricedWhenActive: unpriced products stay in draft
                $or: [{price: {$ne: null}}, {hasVariants: true}],
            },
            {$set: {status: "active"}},
        ).noDeleted();

        logger.debug(`Published ${productResult.modifiedCount} products`);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Scheduled publish job error: ${msg}`);
    }

    logger.finish("Finished scheduled publish job.");
}
