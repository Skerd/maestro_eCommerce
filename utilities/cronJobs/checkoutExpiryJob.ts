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
import { runInTransaction } from "@coreModule/utilities/middlewares/runInTransaction";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import {checkoutService} from "@eCommerceModule/database/schemas/checkout/checkout.service";
import { releaseReservations } from "@eCommerceModule/utilities/services/inventoryReservationService";
import { placePaidCheckoutInBackground, spansSellers } from "@eCommerceModule/workflows/checkoutPlacementService";
import {inShopPurchase} from "@eCommerceModule/utilities/shop/shopPurchase";
import { getPaymentAdapter } from "@eCommerceModule/utilities/services/payment/paymentService";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";

const BATCH_SIZE = 200;
const PURGE_AFTER_DAYS = 30;

/** True when the checkout's charge succeeded (locally recorded, or per the gateway). */
async function chargeSucceeded(checkout: any): Promise<boolean> {
    const intentId = checkout.stripePaymentIntentId as string | undefined;
    if (!intentId) return false;

    const local = await paymentTransactionService.exists({gatewayTransactionId: intentId, type: "charge", status: "succeeded"});
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
    return runInTransaction(ctx.logger, async (session) => {
        const checkout = await checkoutService.findOne({
            _id: checkoutId,
            status: { $in: ["pending", "payment_processing"] },
            expiresAt: { $lte: new Date() },
        }, { session });
        if (!checkout) return false;

        if ((checkout.reservations ?? []).some(r => r.state === "reserved")) {
            await inShopPurchase(spansSellers(checkout), () => releaseReservations(checkout, { ...ctx, session }));
        }
        checkout.status = "expired";
        await checkout.save({ session });
        return true;
    });
}

export async function runCheckoutExpiry(company: ObjectId, parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("checkout_expiry", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running checkout expiry job...");

    try {
        const due = await checkoutService.find({
            company,
            status: { $in: ["pending", "payment_processing"] },
            expiresAt: { $lte: new Date() },
        }, {}, undefined, undefined, undefined, BATCH_SIZE);

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
        // A purge removes the rows for good: soft-deleted checkouts would keep their idempotency keys taken
        const purged = await checkoutService.deleteMany({
            company,
            status: { $in: ["expired", "failed"] },
            updatedAt: { $lte: purgeBefore },
        }, { hard: true });

        logger.finish(
            `Checkout expiry finished: ${expiredCount} expired, ${placedCount} paid checkouts placed, ` +
            `${due.length - expiredCount - placedCount} skipped, ${purged.deletedCount} purged.`,
        );
    } catch (e: any) {
        logger.err("Checkout expiry job failed", e);
        logger.finish("Checkout expiry finished with errors.");
    }
}
