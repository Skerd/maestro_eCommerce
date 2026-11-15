import dayjs from "dayjs";
import GiftCard, {type IGiftCard} from "@financeModule/database/schemas/giftCard/giftCard";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import User from "@coreModule/database/schemas/user/user";
import Currency from "@coreModule/database/schemas/currency/currency";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {giftCardsSeed} from "@eCommerceModule/database/seeds/finance/giftCards.seed";
import type {HydratedDocument} from "mongoose";
import {toMinor} from "armonia/src/modules/core/helpers/money";
import {decimal128FromMinor} from "@coreModule/utilities/helpers/money";

/**
 * Seeds the demo store-credit card issued from DEMO-ORD-1008.
 *
 * `{company, code}` is unique, so that is the idempotency key. Balance is set
 * to the initial amount — later redemptions are runtime mutations, not seed data.
 */
export async function createGiftCards(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<HydratedDocument<IGiftCard>[]> {
    const logger = getLogger("mongoDbInitialization-createGiftCards", parentLogger);
    logger.start(`Creating gift cards (${giftCardsSeed.length})...`);

    const created: HydratedDocument<IGiftCard>[] = [];

    for (const row of giftCardsSeed) {
        try {
            const purchaser = await User.findOne({username: row.purchasedBy.$user}).select("_id");
            if (!purchaser) {
                logger.warn(`Skipping gift card ${row.code}: user "${row.purchasedBy.$user}" not found.`);
                continue;
            }

            const currency = await Currency.findOne({abbreviation: row.currency.$currency}).select("_id decimalPlaces");
            if (!currency) {
                logger.warn(`Skipping gift card ${row.code}: currency "${row.currency.$currency}" not found.`);
                continue;
            }

            const order = await ProductOrder.findOne({
                company: company._id,
                orderNumber: row.orderNumber,
            }).select("_id");
            if (!order) {
                logger.warn(`Skipping gift card ${row.code}: order "${row.orderNumber}" was not seeded.`);
                continue;
            }

            const payload = {
                code: row.code,
                // Stored as Decimal128 at the currency's decimal places (GLB-08)
                initialBalance: decimal128FromMinor(toMinor(row.initialBalance, currency.decimalPlaces), currency.decimalPlaces),
                balance: decimal128FromMinor(toMinor(row.balance, currency.decimalPlaces), currency.decimalPlaces),
                currency: currency._id,
                purchasedBy: purchaser._id,
                order: order._id,
                status: row.status,
                expiresAt: dayjs().add(row.expiresInDays, "day").toDate(),
                company: company._id,
                createdBy: company.createdBy,
            };

            let existing = await GiftCard.findOne({company: company._id, code: row.code});
            if (existing) {
                existing.set(payload);
                await existing.save();
            } else {
                existing = await GiftCard.create(payload);
            }
            created.push(existing);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logger.err(`Error creating gift card ${row.code}: ${message}`);
        }
    }

    logger.finish("Finished creating gift cards!", created.length);
    return created;
}
