/**
 * Hourly job: remind signed-in buyers about carts with items untouched for
 * 24h+. One reminder per cart — `abandonedNotifiedAt` marks it sent, and cart
 * mutations clear it (any save bumps updatedAt; a later change re-arms only
 * after the cart is emptied and refilled via the reminder-reset in cart APIs
 * being unnecessary — one nudge per abandonment cycle is intentional).
 */

import { CONSTANTS } from "@coreModule/environment";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";

const ABANDON_AFTER_HOURS = 24;
const BATCH_SIZE = 200;

export async function runAbandonedCart(parentLogger?: serverLogger): Promise<void> {
    const logger = getLogger("abandoned_cart", parentLogger);
    const lang = CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    logger.start("Running abandoned cart job...");

    try {
        const cutoff = new Date(Date.now() - ABANDON_AFTER_HOURS * 3600000);

        const carts = await Cart.find({
            user: {$ne: null},
            "items.0": {$exists: true},
            updatedAt: {$lte: cutoff},
            abandonedNotifiedAt: null,
        })
            .select("user company items subtotal")
            .limit(BATCH_SIZE);

        let notified = 0;
        for (const cart of carts) {
            try {
                const userId = ((cart.user as any)?._id ?? cart.user)?.toString?.();
                const companyId = ((cart.company as any)?._id ?? cart.company)?.toString?.();
                if (!userId || !companyId) continue;

                emitNotificationEvent(NotificationEventCodes.ABANDONED_CART, {
                    receiverIds: [userId],
                    payload: {
                        companyId,
                        languageCode: lang,
                        cartId: cart._id.toString(),
                        itemCount: (cart.items as any[]).length,
                        subtotal: cart.subtotal,
                    },
                });

                cart.abandonedNotifiedAt = new Date();
                await cart.save();
                notified += 1;
            } catch (e: any) {
                logger.err(`Abandoned-cart reminder failed for cart ${cart._id}`, e);
            }
        }

        logger.finish(`Abandoned cart finished: ${notified}/${carts.length} reminders sent.`);
    } catch (e: any) {
        logger.err("Abandoned cart job failed", e);
        logger.finish("Abandoned cart finished with errors.");
    }
}
