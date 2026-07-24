/**
 * Hourly job: expire abandoned checkouts (pending / payment_processing past
 * expiresAt) and release any inventory reservations still held on them.
 */

import { CONSTANTS } from "@coreModule/environment";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import { releaseCheckoutReservations } from "@eCommerceModule/utilities/services/inventoryReservationService";

const BATCH_SIZE = 200;

export async function runCheckoutExpiry(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("checkout_expiry", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running checkout expiry job...");

    try {
        const expired = await Checkout.find({
            status: { $in: ["pending", "payment_processing"] },
            expiresAt: { $lte: new Date() },
        }).limit(BATCH_SIZE);

        let expiredCount = 0;
        for (const checkout of expired) {
            try {
                const hasHeldStock = (checkout.reservations ?? []).some(r => r.state === "reserved");
                if (hasHeldStock) {
                    await releaseCheckoutReservations(checkout, { logger, languageCode: lang });
                }

                checkout.status = "expired";
                await checkout.save();
                expiredCount += 1;
            } catch (e: any) {
                logger.err(`Failed to expire checkout ${checkout._id}`, e);
            }
        }

        logger.finish(`Checkout expiry finished: ${expiredCount}/${expired.length} expired.`);
    } catch (e: any) {
        logger.err("Checkout expiry job failed", e);
        logger.finish("Checkout expiry finished with errors.");
    }
}
