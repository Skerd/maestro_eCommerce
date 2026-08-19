import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import DigitalDelivery, {type IDigitalDelivery} from "./digitalDelivery";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ECOM_DEMO_TAG} from "@eCommerceModule/database/demo/ecomDemoConstants";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";

export type DigitalDeliverySeed = {
    token: string;
    productKey: string;
    orderNumber: string;
};

export const defaultDigitalDeliverySeeds: readonly DigitalDeliverySeed[] = [
    {token: `${ECOM_DEMO_TAG}:dd-logo-pack`, productKey: "prod-03-logo-pack", orderNumber: "DEMO-ORD-1005"},
    {token: `${ECOM_DEMO_TAG}:dd-ui-kit`, productKey: "prod-04-ui-kit", orderNumber: "DEMO-ORD-1005"},
];

/**
 * Seeds download entitlements for DEMO-ORD-1005 digital products.
 * Token is unique. Empty `media` is OK. Skip if order/product missing.
 */
export async function createDigitalDeliveries(
    parentLogger: serverLogger,
    company: ICompany,
    orders: CreateProductOrdersResult,
    products: CreateProductsResult,
): Promise<HydratedDocument<IDigitalDelivery>[]> {
    const logger = getLogger("mongoDbInitialization-createDigitalDeliveries", parentLogger);
    logger.start("Creating digital deliveries...");

    const created: HydratedDocument<IDigitalDelivery>[] = [];

    for (const seed of defaultDigitalDeliverySeeds) {
        const order = orders.byOrderNumber[seed.orderNumber];
        const product = products.bySeedKey[seed.productKey];
        if (!order) {
            logger.warn(`Skipping digital delivery "${seed.token}": order "${seed.orderNumber}" was not seeded.`);
            continue;
        }
        if (!product) {
            logger.warn(`Skipping digital delivery "${seed.token}": product "${seed.productKey}" was not seeded.`);
            continue;
        }

        try {
            const payload = {
                order: order._id,
                product: product._id,
                customer: order.customer,
                token: seed.token,
                media: [],
                downloadLimit: 5,
                downloadCount: 0,
                expiresAt: dayjs().add(365, "day").toDate(),
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await DigitalDelivery.findOne({token: seed.token});
            if (!doc) {
                doc = await DigitalDelivery.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            created.push(doc);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating digital delivery '${seed.token}': ${message}`);
        }
    }

    logger.finish("Finished creating digital deliveries!", created.length);
    return created;
}
