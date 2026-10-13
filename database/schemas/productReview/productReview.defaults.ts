import type {HydratedDocument} from "mongoose";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductReview, {type IProductReview} from "./productReview";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import {catalogProductReviews} from "@eCommerceModule/database/schemas/product/product.catalog.reviews";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";

/**
 * Seeds one purchase-gated, product-specific review per catalog SKU (requires a
 * delivered coverage order from `createProductOrders`). Unique on `{order, product}`.
 * Updates denormalized rating fields on each product.
 */
export async function createProductReviews(
    parentLogger: serverLogger,
    company: ICompany,
    orders: CreateProductOrdersResult,
    products: CreateProductsResult,
): Promise<HydratedDocument<IProductReview>[]> {
    const logger = getLogger("mongoDbInitialization-createProductReviews", parentLogger);
    logger.start("Creating product reviews...");

    const created: HydratedDocument<IProductReview>[] = [];
    const productKeys = Object.keys(products.bySeedKey).sort();
    let skipped = 0;

    for (const seedKey of productKeys) {
        const product = products.bySeedKey[seedKey];
        if (!product) {
            skipped += 1;
            continue;
        }

        const reviewSeed = catalogProductReviews[seedKey];
        if (!reviewSeed) {
            logger.warn(`Skipping review for "${seedKey}": no entry in catalogProductReviews.`);
            skipped += 1;
            continue;
        }

        const orderNumber = orders.orderNumberByProductKey[seedKey];
        const order = orderNumber ? orders.byOrderNumber[orderNumber] : undefined;
        if (!order) {
            logger.warn(`Skipping review for "${seedKey}": no delivered coverage order was seeded.`);
            skipped += 1;
            continue;
        }

        try {
            const payload = {
                order: order._id,
                product: product._id,
                rating: reviewSeed.rating,
                title: demoName(reviewSeed.title.slice(0, 72)),
                comment: reviewSeed.comment,
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
            created.push(doc);

            await Product.updateOne(
                {_id: product._id},
                {
                    $addToSet: {reviews: doc._id},
                    $set: {
                        ratingAverage: reviewSeed.rating,
                        ratingCount: 1,
                        reviewCount: 1,
                    },
                },
            );
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating product review for '${seedKey}': ${message}`);
            skipped += 1;
        }
    }

    logger.finish(
        `Finished creating product reviews! (${created.length} reviews, ${skipped} skipped)`,
    );
    return created;
}
