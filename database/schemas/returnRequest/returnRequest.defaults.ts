import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import ReturnRequest, {type IReturnRequest} from "./returnRequest";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ECOM_DEMO_TAG} from "@eCommerceModule/database/demo/ecomDemoConstants";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";

export const RETURN_1007_NOTE = `${ECOM_DEMO_TAG}:return-1007`;

/**
 * Seeds a completed return for refunded DEMO-ORD-1007.
 * Idempotent via `customerNote` containing `ecom-demo-seed:return-1007`.
 */
export async function createReturnRequests(
    parentLogger: serverLogger,
    company: ICompany,
    orders: CreateProductOrdersResult,
): Promise<HydratedDocument<IReturnRequest> | undefined> {
    const logger = getLogger("mongoDbInitialization-createReturnRequests", parentLogger);
    logger.start("Creating return requests...");

    const order = orders.byOrderNumber["DEMO-ORD-1007"];
    if (!order) {
        logger.warn("Skipping return request: product order DEMO-ORD-1007 was not seeded.");
        logger.finish("Finished creating return requests!", 0);
        return undefined;
    }
    if (!order.items?.length) {
        logger.warn("Skipping return request: product order DEMO-ORD-1007 has no items.");
        logger.finish("Finished creating return requests!", 0);
        return undefined;
    }

    try {
        const payload = {
            order: order._id,
            type: "return" as const,
            status: "completed" as const,
            items: order.items.map((item) => ({
                orderItemId: item._id,
                quantity: item.quantity,
                reason: "Wrong size strap hardware",
            })),
            refundAmount: order.grandTotal,
            customerNote: `Returned camera strap. [${RETURN_1007_NOTE}]`,
            adminNote: "Refund processed against DEMO-ORD-1007.",
            resolvedBy: company.createdBy,
            resolvedAt: dayjs().subtract(18, "day").toDate(),
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await ReturnRequest.findOne({
            company: company._id,
            customerNote: {$regex: RETURN_1007_NOTE},
        });
        if (!doc) {
            doc = await ReturnRequest.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating return requests!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating return request: ${message}`);
        logger.fail("Failed to create return requests!");
        return undefined;
    }
}
