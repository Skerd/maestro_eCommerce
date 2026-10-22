/**
 * Hourly job: settles checkouts past expiresAt (pending / payment_processing).
 *  - A checkout whose gateway charge already succeeded is placed as an order
 *    (safety net when both the buyer's /confirm and the webhook were lost).
 *  - Everything else is expired and its held stock released.
 * Also purges expired/failed checkouts older than PURGE_AFTER_DAYS — confirmed
 * ones are kept, charges taken at checkout reference them.
 */

import { ObjectId } from "mongodb";
import { CONSTANTS } from "@coreModule/environment";
import { mongooseInstance } from "@coreModule/connections/connectToMongoDb";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import { releaseReservations } from "@eCommerceModule/utilities/services/inventoryReservationService";
import { placePaidCheckoutInBackground } from "@eCommerceModule/utilities/services/checkoutPlacementService";
import { getPaymentAdapter } from "@eCommerceModule/utilities/services/payment/paymentService";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";

const BATCH_SIZE = 200;
const PURGE_AFTER_DAYS = 30;

/** True when the checkout's charge succeeded (locally recorded, or per the gateway). */
async function chargeSucceeded(checkout: any): Promise<boolean> {
    const intentId = checkout.stripePaymentIntentId as string | undefined;
    if (!intentId) return false;

    const local = await PaymentTransaction.exists({gatewayTransactionId: intentId, type: "charge", status: "succeeded"});
    if (local) return true;

    const adapter = getPaymentAdapter("stripe");
    if (!adapter?.isEnabled()) return false;
    const intent = await adapter.retrievePaymentIntent(intentId);
    return intent.status === "succeeded";
}

/**
 * Expires one checkout and releases its holds in a single transaction, re-reading
 * it first: a checkout that was confirmed or resumed since the batch was loaded
 * is left alone, and a failure part-way releases nothing.
 */
async function expireCheckout(checkoutId: ObjectId, ctx: { logger: serverLogger; languageCode: string }): Promise<boolean> {
    const session = await mongooseInstance.startSession();
    let expired = false;
    try {
        await session.withTransaction(async () => {
            expired = false;
            const checkout = await Checkout.findOne({
                _id: checkoutId,
                status: { $in: ["pending", "payment_processing"] },
                expiresAt: { $lte: new Date() },
            }).session(session);
            if (!checkout) return;

            if ((checkout.reservations ?? []).some(r => r.state === "reserved")) {
                await releaseReservations(checkout, { ...ctx, session });
            }
            checkout.status = "expired";
            await checkout.save({ session });
            expired = true;
        });
    } finally {
        await session.endSession();
    }
    return expired;
}

export async function runCheckoutExpiry(company: ObjectId, parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("checkout_expiry", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running checkout expiry job...");

    try {
        const due = await Checkout.find({
            company,
            status: { $in: ["pending", "payment_processing"] },
            expiresAt: { $lte: new Date() },
        }).limit(BATCH_SIZE);

        let expiredCount = 0;
        let placedCount = 0;
        for (const checkout of due) {
            try {
                if (await chargeSucceeded(checkout)) {
                    const order = await placePaidCheckoutInBackground(checkout._id as any, { logger, languageCode: lang });
                    if (order) placedCount += 1;
                    continue;
                }

                // Close the open intent first so it can't be paid after the stock is released
                const adapter = getPaymentAdapter("stripe");
                if (checkout.stripePaymentIntentId && adapter?.isEnabled()) {
                    const intent = await adapter.cancelPaymentIntent(checkout.stripePaymentIntentId);
                    if (intent.status === "succeeded") continue; // paid meanwhile — next run places it
                }

                if (await expireCheckout(checkout._id, { logger, languageCode: lang })) expiredCount += 1;
            } catch (e: any) {
                logger.err(`Failed to settle checkout ${checkout._id}`, e);
            }
        }

        const purgeBefore = new Date(Date.now() - PURGE_AFTER_DAYS * 86400000);
        const purged = await Checkout.deleteMany({
            company,
            status: { $in: ["expired", "failed"] },
            updatedAt: { $lte: purgeBefore },
        });

        logger.finish(
            `Checkout expiry finished: ${expiredCount} expired, ${placedCount} paid checkouts placed, ` +
            `${due.length - expiredCount - placedCount} skipped, ${purged.deletedCount ?? 0} purged.`,
        );
    } catch (e: any) {
        logger.err("Checkout expiry job failed", e);
        logger.finish("Checkout expiry finished with errors.");
    }
}
