import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import PosOrder, {type IPosOrder} from "./posOrder";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ECOM_DEMO_TAG} from "@eCommerceModule/database/demo/ecomDemoConstants";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreatePosPaymentMethodsResult} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.defaults";

export const POS_ORDER_NAME = `${ECOM_DEMO_TAG}:pos-order-1`;

/**
 * Seeds one paid POS order on the closed session. Unique on `{company, name}`.
 * Fiscal / terminal / refund-of fields are left unset — those enums and secrets
 * are not invented here.
 */
export async function createPosOrders(
    parentLogger: serverLogger,
    company: ICompany,
    sessionId: Types.ObjectId | undefined,
    configId: Types.ObjectId | undefined,
    methods: CreatePosPaymentMethodsResult,
    products: CreateProductsResult,
    cashierId: Types.ObjectId,
    customerId: Types.ObjectId | undefined,
): Promise<HydratedDocument<IPosOrder> | undefined> {
    const logger = getLogger("mongoDbInitialization-createPosOrders", parentLogger);
    logger.start("Creating POS orders...");

    if (!sessionId) {
        logger.warn("Skipping POS order: POS session was not seeded.");
        logger.finish("Finished creating POS orders!", 0);
        return undefined;
    }
    if (!configId) {
        logger.warn("Skipping POS order: POS config was not seeded.");
        logger.finish("Finished creating POS orders!", 0);
        return undefined;
    }

    const hoodie = products.bySeedKey["prod-02-hoodie"];
    if (!hoodie) {
        logger.warn("Skipping POS order: product \"prod-02-hoodie\" was not seeded.");
        logger.finish("Finished creating POS orders!", 0);
        return undefined;
    }

    const cash = methods.byName["Cash"];
    if (!cash) {
        logger.warn("Skipping POS order: Cash payment method was not seeded.");
        logger.finish("Finished creating POS orders!", 0);
        return undefined;
    }

    const unitPrice = Number(hoodie.price ?? 69);
    const taxAmount = Math.round(unitPrice * 0.2 * 100) / 100;
    const priceTotal = Math.round((unitPrice + taxAmount) * 100) / 100;

    try {
        const payload = {
            name: POS_ORDER_NAME,
            session: sessionId,
            config: configId,
            state: "paid" as const,
            cashier: cashierId,
            ...(customerId ? {customer: customerId, customerName: "Almir Leka"} : {}),
            lines: [
                {
                    product: hoodie._id,
                    quantity: 1,
                    quantityRefunded: 0,
                    unitPrice,
                    discountPercent: 0,
                    discountAmount: 0,
                    priceSubtotal: unitPrice,
                    priceTotal,
                    taxAmount,
                    productName: hoodie.title,
                    productSku: hoodie.sku,
                },
            ],
            payments: [
                {
                    paymentMethod: cash._id,
                    paymentMethodName: cash.name,
                    paymentMethodType: "cash",
                    amount: priceTotal,
                    paymentDate: dayjs().subtract(1, "day").toDate(),
                },
            ],
            amountTax: taxAmount,
            amountTotal: priceTotal,
            amountPaid: priceTotal,
            amountReturn: 0,
            discountTotal: 0,
            amountRefunded: 0,
            note: ECOM_DEMO_TAG,
            orderDiscountPercent: 0,
            isRefund: false,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await PosOrder.findOne({company: company._id, name: POS_ORDER_NAME});
        if (!doc) {
            doc = await PosOrder.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating POS orders!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating POS order: ${message}`);
        logger.fail("Failed to create POS orders!");
        return undefined;
    }
}
