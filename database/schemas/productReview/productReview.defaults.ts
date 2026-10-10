import type {HydratedDocument} from "mongoose";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductReview, {type IProductReview} from "./productReview";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";

/**
 * Seeds one purchase-gated review on DEMO-ORD-1005 / prod-03-logo-pack.
 * Unique on `{order, product}`.
 */
export async function createProductReviews(
    parentLogger: serverLogger,
    company: ICompany,
    orders: CreateProductOrdersResult,
    products: CreateProductsResult,
): Promise<HydratedDocument<IProductReview> | undefined> {
    const logger = getLogger("mongoDbInitialization-createProductReviews", parentLogger);
    logger.start("Creating product reviews...");

    const order = orders.byOrderNumber["DEMO-ORD-1005"];
    const product = products.bySeedKey["prod-03-logo-pack"];
    if (!order) {
        logger.warn("Skipping product review: product order DEMO-ORD-1005 was not seeded.");
        logger.finish("Finished creating product reviews!", 0);
        return undefined;
    }
    if (!product) {
        logger.warn("Skipping product review: product \"prod-03-logo-pack\" was not seeded.");
        logger.finish("Finished creating product reviews!", 0);
        return undefined;
    }

    try {
        const payload = {
            order: order._id,
            product: product._id,
            rating: 5,
            title: "Clean source files",
            comment: "The SVG pack dropped straight into our brand kit. Exactly what the listing promised.",
            reviewer: order.customer,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await ProductReview.findOne({order: order._id, product: product._id});
        if (!doc) {
            doc = await ProductReview.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        await Product.updateOne(
            {_id: product._id},
            {$addToSet: {reviews: doc._id}},
        );
        logger.finish("Finished creating product reviews!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating product review: ${message}`);
        logger.fail("Failed to create product reviews!");
        return undefined;
    }
}
