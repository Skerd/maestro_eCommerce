import type {ObjectId} from "mongodb";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {notHiddenByPlatform} from "@coreModule/database/plugins/platformHiddenPlugin";

/**
 * Recomputes a product's stored rating (average, count) from its live reviews. The rating is a system-computed
 * denormalization on the product, refreshed whenever a review is written or changed, and when the platform hides or shows
 * one after a report (D191): a hidden review counts nowhere.
 */
export async function refreshProductRating(productId: ObjectId, ctx: CrudOptions): Promise<void> {
    const [row]: {avg: number; count: number}[] = await productReviewService.aggregate(
        [
            {$match: {product: productId, ...notHiddenByPlatform()}},
            {$group: {_id: null, avg: {$avg: "$rating"}, count: {$sum: 1}}},
        ],
        {...ctx, withDeleted: false},
    );
    const average = row ? Math.round(Number(row.avg) * 10) / 10 : 0;
    const count = row ? Number(row.count) : 0;
    await productService.updateById(productId, {$set: {ratingAverage: average, ratingCount: count, reviewCount: count}}, ctx);
}
