/**
 * Hourly job: close open TaskRequests whose expiresAt has passed.
 */

import { CronJob } from "cron";
import { CONSTANTS } from "@coreModule/environment";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import { taskRequestService } from "@eCommerceMarketplaceModule/database/schemas/taskRequest/taskRequest.service";

let expiryJob: CronJob | null = null;

export async function runTaskRequestExpiry(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("task_request_expiry", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running task request expiry job...");

    try {
        const now = new Date();

        const expiredRequests = await taskRequestService.find(
            { status: "open", expiresAt: { $lte: now } },
            { logger, languageCode: lang },
            null,
            "_id",
            { expiresAt: 1 },
            500,
            0
        );

        for (const req of expiredRequests) {
            try {
                await taskRequestService.updateById(
                    req._id,
                    { $set: { status: "closed" } },
                    { logger, languageCode: lang }
                );
                logger.debug(`Closed expired task request ${req._id.toString()}`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                logger.err(`Failed to close task request ${req._id?.toString?.()}: ${msg}`);
            }
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.err(`Task request expiry job error: ${msg}`);
    }

    logger.finish("Finished task request expiry job.");
}

export function startTaskRequestExpiryJob(parentLogger?: serverLogger): void {
    const log = getLogger("task_request_expiry_cron", parentLogger);
    if (expiryJob !== null) return;
    expiryJob = new CronJob(
        "0 0 * * * *",
        () => { void runTaskRequestExpiry(parentLogger); },
        null,
        true,
        "UTC"
    );
    log.debug("Task request expiry job scheduled (cron: 0 0 * * * * UTC — hourly)");
}

export function stopTaskRequestExpiryJob(): void {
    if (expiryJob) {
        expiryJob.stop();
        expiryJob = null;
    }
}
