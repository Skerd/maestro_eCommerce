import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Cart, {type ICart} from "./cart";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";

export const OPEN_CART_SESSION_ID = `ecom-demo-seed:cart-open`;
export const CONFIRMED_CART_SESSION_ID = `ecom-demo-seed:cart-confirmed`;

export type CreateCartsResult = {
    open?: HydratedDocument<ICart>;
    confirmed?: HydratedDocument<ICart>;
};

type CartLineSpec = {productKey: string; quantity: number};

async function upsertCart(
    logger: ReturnType<typeof getLogger>,
    company: ICompany,
    currencyId: Types.ObjectId,
    customerId: Types.ObjectId,
    products: CreateProductsResult,
    sessionId: string,
    lineSpecs: readonly CartLineSpec[],
): Promise<HydratedDocument<ICart> | undefined> {
    const items = [];
    for (const line of lineSpecs) {
        const product = products.bySeedKey[line.productKey];
        if (!product) {
            logger.warn(`Skipping cart "${sessionId}": product "${line.productKey}" was not seeded.`);
            return undefined;
        }
        const unitPrice = Number(product.price ?? 0);
        items.push({
            product: product._id,
            quantity: line.quantity,
            unitPrice,
            totalPrice: unitPrice * line.quantity,
            snapshot: {title: product.title, sku: product.sku},
        });
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const payload = {
        sessionId,
        user: customerId,
        company: company._id,
        items,
        currency: currencyId,
        subtotal,
        discountTotal: 0,
        estimatedTotal: subtotal,
        expiresAt: dayjs().add(10, "year").toDate(),
    };

    let doc = await Cart.findOne({company: company._id, sessionId});
    if (!doc) {
        doc = await Cart.create(payload);
    } else {
        doc.set(payload);
        await doc.save();
    }
    return doc;
}

/**
 * Seeds the open demo cart (hoodie + logo pack) and a second cart that backs
 * the confirmed checkout (DEMO-ORD-1002 lines). Both expire far in the future
 * so the TTL index does not delete them. Idempotent on `{company, sessionId}`.
 */
export async function createCarts(
    parentLogger: serverLogger,
    company: ICompany,
    currencyId: Types.ObjectId,
    products: CreateProductsResult,
    customerId: Types.ObjectId | undefined,
): Promise<CreateCartsResult> {
    const logger = getLogger("mongoDbInitialization-createCarts", parentLogger);
    logger.start("Creating carts...");

    if (!customerId) {
        logger.warn("Skipping carts: customer echo@echo.com was not found.");
        logger.finish("Finished creating carts!", 0);
        return {};
    }

    const result: CreateCartsResult = {};
    try {
        result.open = await upsertCart(
            logger,
            company,
            currencyId,
            customerId,
            products,
            OPEN_CART_SESSION_ID,
            [
                {productKey: "prod-02-hoodie", quantity: 1},
                {productKey: "prod-03-logo-pack", quantity: 1},
            ],
        );
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating open cart: ${message}`);
    }

    try {
        result.confirmed = await upsertCart(
            logger,
            company,
            currencyId,
            customerId,
            products,
            CONFIRMED_CART_SESSION_ID,
            [
                {productKey: "prod-01-brand-tee", quantity: 1},
                {productKey: "prod-02-hoodie", quantity: 1},
            ],
        );
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating confirmed-checkout cart: ${message}`);
    }

    const count = Number(Boolean(result.open)) + Number(Boolean(result.confirmed));
    logger.finish("Finished creating carts!", count);
    return result;
}
