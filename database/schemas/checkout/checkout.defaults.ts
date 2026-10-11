import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Checkout, {type ICheckout} from "./checkout";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import type {CreateCartsResult} from "@eCommerceModule/database/schemas/cart/cart.defaults";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";

export const PENDING_CHECKOUT_KEY = `ecom-demo-seed:checkout-pending`;
export const CONFIRMED_CHECKOUT_KEY = `ecom-demo-seed:checkout-confirmed`;

export type CreateCheckoutsResult = {
    pending?: HydratedDocument<ICheckout>;
    confirmed?: HydratedDocument<ICheckout>;
};

/**
 * Seeds one pending cart-backed checkout and one confirmed checkout whose
 * totals match paid DEMO-ORD-1002.
 *
 * `expiresAt` is far in the future — the schema has a TTL index
 * `{expireAfterSeconds: 0}`. Never writes `stripeClientSecret` / payment intents.
 * Idempotent on `idempotencyKey`.
 */
export async function createCheckouts(
    parentLogger: serverLogger,
    company: ICompany,
    currencyId: Types.ObjectId,
    carts: CreateCartsResult,
    orders: CreateProductOrdersResult,
    customerId: Types.ObjectId | undefined,
    geo: {countryId?: Types.ObjectId; stateId?: Types.ObjectId; cityId?: Types.ObjectId},
    addr: typeof defaultCompaniesValues.address,
): Promise<CreateCheckoutsResult> {
    const logger = getLogger("mongoDbInitialization-createCheckouts", parentLogger);
    logger.start("Creating checkouts...");

    const result: CreateCheckoutsResult = {};
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
    const expiresAt = dayjs().add(10, "year").toDate();

    if (carts.open) {
        try {
            const items = carts.open.items.map((item) => ({
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                snapshot: item.snapshot,
            }));
            const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
            const payload = {
                cart: carts.open._id,
                user: customerId,
                company: company._id,
                items,
                shippingAddress,
                billingAddress: shippingAddress,
                availableShippingRates: [
                    {name: "Standard", carrier: "Posta Shqiptare", price: 4.5, estimatedDeliveryDays: 3},
                ],
                selectedShippingRate: {name: "Standard", carrier: "Posta Shqiptare", price: 4.5, estimatedDeliveryDays: 3},
                taxBreakdown: [{name: "VAT", rate: 20, amount: Math.round(subtotal * 0.2 * 100) / 100}],
                subtotal,
                discountTotal: 0,
                shippingTotal: 4.5,
                taxTotal: Math.round(subtotal * 0.2 * 100) / 100,
                grandTotal: Math.round((subtotal + 4.5 + subtotal * 0.2) * 100) / 100,
                currency: currencyId,
                paymentMethod: "cod" as const,
                status: "pending" as const,
                idempotencyKey: PENDING_CHECKOUT_KEY,
                expiresAt,
            };

            let doc = await Checkout.findOne({idempotencyKey: PENDING_CHECKOUT_KEY});
            if (!doc) {
                doc = await Checkout.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            result.pending = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating pending checkout: ${message}`);
        }
    } else {
        logger.warn("Skipping pending checkout: open cart was not seeded.");
    }

    const paidOrder = orders.byOrderNumber["DEMO-ORD-1002"];
    if (!carts.confirmed) {
        logger.warn("Skipping confirmed checkout: confirmed-checkout cart was not seeded.");
    } else if (!paidOrder) {
        logger.warn("Skipping confirmed checkout: product order DEMO-ORD-1002 was not seeded.");
    } else {
        try {
            const items = paidOrder.items.map((item) => ({
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                snapshot: item.snapshot,
            }));
            const payload = {
                cart: carts.confirmed._id,
                user: paidOrder.customer,
                company: company._id,
                items,
                shippingAddress,
                billingAddress: shippingAddress,
                selectedShippingRate: paidOrder.shippingRate
                    ? {
                          name: paidOrder.shippingRate.name,
                          carrier: paidOrder.shippingRate.carrier,
                          price: paidOrder.shippingRate.price,
                      }
                    : {name: "Standard", price: paidOrder.shippingTotal},
                taxBreakdown: paidOrder.taxBreakdown ?? [],
                subtotal: paidOrder.subtotal,
                discountTotal: paidOrder.discountTotal,
                shippingTotal: paidOrder.shippingTotal,
                taxTotal: paidOrder.taxTotal,
                grandTotal: paidOrder.grandTotal,
                currency: currencyId,
                paymentMethod: "bank_transfer" as const,
                status: "confirmed" as const,
                idempotencyKey: CONFIRMED_CHECKOUT_KEY,
                expiresAt,
            };

            let doc = await Checkout.findOne({idempotencyKey: CONFIRMED_CHECKOUT_KEY});
            if (!doc) {
                doc = await Checkout.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            result.confirmed = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating confirmed checkout: ${message}`);
        }
    }

    const count = Number(Boolean(result.pending)) + Number(Boolean(result.confirmed));
    logger.finish("Finished creating checkouts!", count);
    return result;
}
