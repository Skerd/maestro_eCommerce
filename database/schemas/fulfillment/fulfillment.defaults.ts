import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import Fulfillment, {type FulfillmentStatus, type IFulfillment} from "./fulfillment";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";

export type FulfillmentSeed = {
    orderNumber: string;
    trackingNumber: string;
    carrier: string;
    status: FulfillmentStatus;
    daysAgoShipped: number;
    daysAgoDelivered?: number;
};

export const defaultFulfillmentSeeds: readonly FulfillmentSeed[] = [
    {
        orderNumber: "DEMO-ORD-1004",
        trackingNumber: "ECOM-DEMO-TRK-1004",
        carrier: "Posta Shqiptare",
        status: "shipped",
        daysAgoShipped: 5,
    },
    {
        orderNumber: "DEMO-ORD-1005",
        trackingNumber: "ECOM-DEMO-TRK-1005",
        carrier: "Digital Delivery",
        status: "delivered",
        daysAgoShipped: 12,
        daysAgoDelivered: 11,
    },
];

/**
 * Seeds fulfillments for shipped 1004 and delivered 1005.
 * Uses `order.items[]._id` as `orderItemId`.
 * Idempotent on `{company, order, trackingNumber}`.
 */
export async function createFulfillments(
    parentLogger: serverLogger,
    company: ICompany,
    orders: CreateProductOrdersResult,
): Promise<HydratedDocument<IFulfillment>[]> {
    const logger = getLogger("mongoDbInitialization-createFulfillments", parentLogger);
    logger.start("Creating fulfillments...");

    const created: HydratedDocument<IFulfillment>[] = [];

    for (const seed of defaultFulfillmentSeeds) {
        const order = orders.byOrderNumber[seed.orderNumber];
        if (!order) {
            logger.warn(`Skipping fulfillment "${seed.trackingNumber}": order "${seed.orderNumber}" was not seeded.`);
            continue;
        }
        if (!order.items?.length) {
            logger.warn(`Skipping fulfillment "${seed.trackingNumber}": order "${seed.orderNumber}" has no items.`);
            continue;
        }

        try {
            const payload = {
                order: order._id,
                items: order.items.map((item) => ({
                    orderItemId: item._id,
                    quantity: item.quantity,
                })),
                carrier: seed.carrier,
                trackingNumber: seed.trackingNumber,
                trackingUrl: `https://track.test.local/${seed.trackingNumber}`,
                shippedAt: dayjs().subtract(seed.daysAgoShipped, "day").toDate(),
                estimatedDeliveryAt: dayjs().subtract(Math.max(0, seed.daysAgoShipped - 2), "day").toDate(),
                ...(seed.daysAgoDelivered !== undefined
                    ? {deliveredAt: dayjs().subtract(seed.daysAgoDelivered, "day").toDate()}
                    : {}),
                status: seed.status,
                notes: "ecom-demo-seed",
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await Fulfillment.findOne({
                company: company._id,
                order: order._id,
                trackingNumber: seed.trackingNumber,
            });
            if (!doc) {
                doc = await Fulfillment.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            created.push(doc);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating fulfillment '${seed.trackingNumber}': ${message}`);
        }
    }

    logger.finish("Finished creating fulfillments!", created.length);
    return created;
}
