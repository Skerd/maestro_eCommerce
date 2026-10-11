import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import ProductOrder, {
    type IProductOrder,
    type ProductOrderFulfillmentStatus,
    type ProductOrderPaymentStatus,
    type ProductOrderStatus,
} from "./productOrder";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";

export type ProductOrderSeed = {
    orderNumber: string;
    status: ProductOrderStatus;
    paymentStatus: ProductOrderPaymentStatus;
    fulfillmentStatus: ProductOrderFulfillmentStatus;
    productKeys: string[];
    shippingTotal: number;
    discountTotal: number;
    taxRate: number;
    daysAgo: number;
    notes?: string;
};

export const defaultProductOrderSeeds: readonly ProductOrderSeed[] = [
    {
        orderNumber: "DEMO-ORD-1001",
        status: "pending",
        paymentStatus: "unpaid",
        fulfillmentStatus: "unfulfilled",
        productKeys: ["prod-02-hoodie"],
        shippingTotal: 4.5,
        discountTotal: 0,
        taxRate: 0.2,
        daysAgo: 1,
        notes: "Awaiting payment confirmation.",
    },
    {
        orderNumber: "DEMO-ORD-1002",
        status: "confirmed",
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        productKeys: ["prod-01-brand-tee", "prod-02-hoodie"],
        shippingTotal: 4.5,
        discountTotal: 5,
        taxRate: 0.2,
        daysAgo: 2,
    },
    {
        orderNumber: "DEMO-ORD-1003",
        status: "processing",
        paymentStatus: "paid",
        fulfillmentStatus: "partially_fulfilled",
        productKeys: ["prod-02-hoodie"],
        shippingTotal: 9.9,
        discountTotal: 0,
        taxRate: 0.2,
        daysAgo: 4,
    },
    {
        orderNumber: "DEMO-ORD-1004",
        status: "shipped",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        productKeys: ["prod-01-brand-tee", "prod-03-logo-pack"],
        shippingTotal: 0,
        discountTotal: 10,
        taxRate: 0.2,
        daysAgo: 6,
    },
    {
        orderNumber: "DEMO-ORD-1005",
        status: "delivered",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        productKeys: ["prod-03-logo-pack"],
        shippingTotal: 0,
        discountTotal: 0,
        taxRate: 0.2,
        daysAgo: 12,
    },
    {
        orderNumber: "DEMO-ORD-1006",
        status: "cancelled",
        paymentStatus: "voided",
        fulfillmentStatus: "unfulfilled",
        productKeys: ["prod-01-brand-tee"],
        shippingTotal: 0,
        discountTotal: 0,
        taxRate: 0,
        daysAgo: 8,
        notes: "Customer cancelled before fulfillment.",
    },
    {
        orderNumber: "DEMO-ORD-1007",
        status: "refunded",
        paymentStatus: "refunded",
        fulfillmentStatus: "returned",
        productKeys: ["prod-02-hoodie"],
        shippingTotal: 4.5,
        discountTotal: 0,
        taxRate: 0.2,
        daysAgo: 20,
        notes: "Returned — wrong size.",
    },
    {
        orderNumber: "DEMO-ORD-1008",
        status: "delivered",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        productKeys: ["prod-03-logo-pack"],
        shippingTotal: 0,
        discountTotal: 0,
        taxRate: 0,
        daysAgo: 3,
        notes: "Delivered digital purchase.",
    },
];

export type CreateProductOrdersResult = {
    byOrderNumber: Record<string, HydratedDocument<IProductOrder>>;
};

/**
 * Seeds catalog orders across statuses using the three demo products.
 * Idempotent on `{company, orderNumber}` / `idempotencyKey`.
 */
export async function createProductOrders(
    parentLogger: serverLogger,
    company: ICompany,
    currencyId: Types.ObjectId,
    products: CreateProductsResult,
    pickUser: (i: number) => Types.ObjectId,
    geo: {countryId?: Types.ObjectId; stateId?: Types.ObjectId; cityId?: Types.ObjectId},
    addr: typeof defaultCompaniesValues.address,
): Promise<CreateProductOrdersResult> {
    const logger = getLogger("mongoDbInitialization-createProductOrders", parentLogger);
    logger.start("Creating product orders...");

    const shippingAddress = {
        firstName: "echo",
        lastName: "silence",
        phone: "+355 69 000 0000",
        street: addr.street,
        city: addr.cityName,
        state: addr.stateCode,
        postalCode: addr.postalCode,
        ...(geo.countryId ? {country: geo.countryId} : {}),
    };
    const byOrderNumber: Record<string, HydratedDocument<IProductOrder>> = {};

    for (let oi = 0; oi < defaultProductOrderSeeds.length; oi++) {
        const seed = defaultProductOrderSeeds[oi];
        try {
            const items = [];
            let missingProduct = false;
            for (const key of seed.productKeys) {
                const product = products.bySeedKey[key];
                if (!product) {
                    logger.warn(
                        `Skipping product order "${seed.orderNumber}": product "${key}" was not seeded.`,
                    );
                    missingProduct = true;
                    break;
                }
                const unitPrice = Number(product.price ?? 0);
                const quantity = 1;
                items.push({
                    product: product._id,
                    quantity,
                    unitPrice,
                    totalPrice: unitPrice * quantity,
                    snapshot: {title: product.title, sku: product.sku},
                });
            }
            if (missingProduct) continue;

            const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
            const taxTotal = Math.round((subtotal - seed.discountTotal) * seed.taxRate * 100) / 100;
            const grandTotal =
                Math.round((subtotal - seed.discountTotal + seed.shippingTotal + taxTotal) * 100) / 100;

            const payload = {
                orderNumber: seed.orderNumber,
                customer: pickUser(oi + 1),
                company: company._id,
                items,
                subtotal,
                discountTotal: seed.discountTotal,
                shippingTotal: seed.shippingTotal,
                taxTotal,
                grandTotal,
                currency: currencyId,
                shippingAddress,
                billingAddress: shippingAddress,
                paymentStatus: seed.paymentStatus,
                fulfillmentStatus: seed.fulfillmentStatus,
                status: seed.status,
                taxBreakdown: seed.taxRate
                    ? [{name: "VAT", rate: seed.taxRate * 100, amount: taxTotal}]
                    : [],
                shippingRate:
                    seed.shippingTotal > 0
                        ? {name: seed.shippingTotal > 5 ? "Express" : "Standard", price: seed.shippingTotal}
                        : {name: "Free", price: 0},
                notes: seed.notes,
                internalNotes: "ecom-demo-seed",
                timeline: [
                    {
                        event: "created",
                        timestamp: dayjs().subtract(seed.daysAgo, "day").toDate(),
                        userId: company.createdBy,
                        note: "Demo order seeded",
                    },
                    {
                        event: seed.status,
                        timestamp: dayjs().subtract(Math.max(0, seed.daysAgo - 1), "day").toDate(),
                        userId: company.createdBy,
                    },
                ],
                idempotencyKey: `ecom-demo-seed:${seed.orderNumber}`,
                createdBy: company.createdBy,
            };

            let order = await ProductOrder.findOne({company: company._id, orderNumber: seed.orderNumber});
            if (!order) {
                order = await ProductOrder.create(payload);
                logger.debug(`Created product order ${seed.orderNumber}`);
            } else {
                order.set(payload);
                await order.save();
            }
            byOrderNumber[seed.orderNumber] = order;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating product order '${seed.orderNumber}': ${message}`);
        }
    }

    logger.finish("Finished creating product orders!", Object.keys(byOrderNumber).length);
    return {byOrderNumber};
}
