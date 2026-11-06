import PaymentTransaction, {type IPaymentTransaction} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import Currency from "@coreModule/database/schemas/currency/currency";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {paymentTransactionsSeed} from "@eCommerceModule/database/seeds/finance/paymentTransactions.seed";
import type {HydratedDocument} from "mongoose";
import {toMinor} from "armonia/src/modules/core/helpers/money";
import {decimal128FromMinor} from "@coreModule/utilities/helpers/money";

const DEMO_SEED_META = "demoSeed";

/**
 * Seeds the catalog-order payment ledger.
 *
 * Amounts come from the order's `grandTotal` so they stay in lock-step with the
 * eCommerce seeder. Idempotency is `metadata.demoSeed` — the schema has no
 * unique source+type key, and live gateway ids must never be invented.
 *
 * `create: no-permission` on the schema is an API lock; Model.create still
 * writes, which is how the payment service records rows.
 */
export async function createPaymentTransactions(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<HydratedDocument<IPaymentTransaction>[]> {
    const logger = getLogger("mongoDbInitialization-createPaymentTransactions", parentLogger);
    logger.start(`Creating payment transactions (${paymentTransactionsSeed.length})...`);

    const created: HydratedDocument<IPaymentTransaction>[] = [];
    const currency = await Currency.findOne({abbreviation: "EUR", company: company._id}).select("_id");
    if (!currency) {
        logger.warn("Skipping payment transactions: EUR currency not found.");
        logger.finish("Finished creating payment transactions!", 0);
        return created;
    }

    for (const row of paymentTransactionsSeed) {
        try {
            const order = await ProductOrder.findOne({
                company: company._id,
                orderNumber: row.orderNumber,
            }).select("_id grandTotal currency");
            if (!order) {
                logger.warn(`Skipping payment "${row.seedKey}": order "${row.orderNumber}" was not seeded.`);
                continue;
            }

            // Stored as Decimal128 (GLB-08); the demo currency has 2 decimals.
            const amount = decimal128FromMinor(toMinor(row.amount ?? order.grandTotal));
            const refundedAmount =
                row.status === "refunded" ? amount : decimal128FromMinor(toMinor(row.refundedAmount));

            const payload = {
                sourceType: "productOrder" as const,
                sourceId: order._id,
                gateway: row.gateway,
                type: row.type,
                status: row.status,
                amount,
                currency: order.currency ?? currency._id,
                refundedAmount,
                ...(row.failureReason ? {failureReason: row.failureReason} : {}),
                metadata: {[DEMO_SEED_META]: row.seedKey},
                company: company._id,
                createdBy: company.createdBy,
            };

            let existing = await PaymentTransaction.findOne({
                company: company._id,
                [`metadata.${DEMO_SEED_META}`]: row.seedKey,
            });
            if (existing) {
                existing.set(payload);
                await existing.save();
            } else {
                existing = await PaymentTransaction.create(payload);
            }
            created.push(existing);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logger.err(`Error creating payment "${row.seedKey}": ${message}`);
        }
    }

    logger.finish("Finished creating payment transactions!", created.length);
    return created;
}
