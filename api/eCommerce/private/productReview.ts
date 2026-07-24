import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {z} from "zod";
import {createProductReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/createProductReview.form.validator";
import {productReviewListFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReviewList.form.validator";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {
    productReviewToDTO,
    productReviewsToDTO,
    productReviewsToSelect,
} from "@eCommerceModule/utilities/mappers/productReviewMapper.dto";

/**
 * Ratings are system-computed denormalizations on the product (schema-def
 * marks them as such) — recomputed on every review create/delete/restore.
 */
async function recalculateProductRating(
    productId: ObjectId,
    ctx: {session: any; logger: any; languageCode: string},
): Promise<void> {
    const agg = await productReviewService.aggregate(
        [
            {$match: {product: productId, deletedAt: null}},
            {$group: {_id: null, avg: {$avg: "$rating"}, count: {$sum: 1}}},
        ],
        ctx,
    );
    const avg = agg.length > 0 ? Math.round((agg[0].avg as number) * 10) / 10 : 0;
    const count = agg.length > 0 ? (agg[0].count as number) : 0;
    await productService.updateById(
        productId,
        {$set: {ratingAverage: avg, ratingCount: count, reviewCount: count}},
        {...ctx, auditUserId: undefined as any},
    );
}

function productIdFromReview(doc: any): ObjectId | null {
    const raw = doc?.product?._id ?? doc?.product;
    return raw ? new ObjectId(raw) : null;
}

const REVIEWABLE_PAYMENT_STATUSES = ["paid", "partially_refunded"];

export const basePath = "/api/eCommerce/productReview";
export const {router} = createCrudRouter({
    collectionName: "productReviews",
    model: ProductReview,
    service: productReviewService,
    entityName: "ProductReview",
    defaultSort: {createdAt: -1},
    selectSearchField: "comment",
    rateLimits: {read: 60, write: 30, delete: 20},
    listSchema: productReviewListFormSchema,
    createSchema: createProductReviewFormSchema,
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: productReviewToDTO,
    toDTOArray: productReviewsToDTO,
    toSelect: productReviewsToSelect,
    extraListFilter: async ({productId, orderId, rating, comment}) => {
        const filter: Record<string, unknown> = {};
        if (productId) filter.product = new ObjectId(productId as string);
        if (orderId) filter.order = new ObjectId(orderId as string);
        if (rating != null) filter.rating = rating;
        if (comment && typeof comment === "string" && comment.trim()) {
            filter.comment = {$regex: comment.trim(), $options: "i"};
        }
        return filter;
    },
    buildCreateData: async ({orderId, productId, rating, title, comment, actionUserCtx, company, session, logger, languageCode}) => {
        const order = await ProductOrder.findOne({_id: new ObjectId(orderId), company: company._id, deletedAt: null}).session(session);
        if (!order) {
            throw apiValidationException("order_not_found", null, null, languageCode);
        }

        const customerId = (order.customer as any)?._id?.toString?.() || (order.customer as any)?.toString?.();
        if (customerId !== actionUserCtx.userId.toString()) {
            throw apiValidationException("only_customer_can_review", null, null, languageCode);
        }

        if (!REVIEWABLE_PAYMENT_STATUSES.includes(order.paymentStatus)) {
            throw apiValidationException("order_must_be_paid_to_review", null, null, languageCode);
        }

        const lineHasProduct = (order.items as any[]).some(item => {
            const itemProductId = (item.product?._id ?? item.product)?.toString?.();
            return itemProductId === productId;
        });
        if (!lineHasProduct) {
            throw apiValidationException("product_not_in_order", null, null, languageCode);
        }

        const existing = await productReviewService.findOne(
            {order: new ObjectId(orderId), product: new ObjectId(productId)},
            {session, logger, languageCode},
        );
        if (existing) {
            throw apiValidationException("product_already_reviewed_for_order", null, null, languageCode);
        }

        return {
            order: new ObjectId(orderId),
            product: new ObjectId(productId),
            rating,
            title: title?.trim() || undefined,
            comment: comment?.trim() || "",
            reviewer: actionUserCtx.userId,
        };
    },
    /** Reviews are create-only; moderation is delete/restore. */
    buildUpdateData: async () => ({}),
    afterCreate: async (created, params) => {
        const productId = productIdFromReview(created);
        if (productId) {
            await recalculateProductRating(productId, {
                session: params.session,
                logger: params.logger,
                languageCode: params.languageCode,
            });
        }
    },
    beforeDelete: async (params) => {
        if (!params.actionUserCtx.isAdmin) {
            throw apiValidationException("only_admin_can_delete_review", null, null, params.languageCode);
        }
    },
    afterDelete: async (params, doc) => {
        const productId = productIdFromReview(doc);
        if (productId) {
            await recalculateProductRating(productId, {
                session: params.session,
                logger: params.logger,
                languageCode: params.languageCode,
            });
        }
    },
    overrideRestoreHandler: async (params) => {
        const {logger, languageCode, session, _id, actionUserCtx, company} = params;

        logger.start(`Restoring ProductReview ${_id}...`);
        SchemaGuard.checkModelPermission(ProductReview, "restore", actionUserCtx, languageCode);

        const restored = await productReviewService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const productId = productIdFromReview(restored);
        if (productId) {
            await recalculateProductRating(productId, {session, logger, languageCode});
        }

        logger.finish(`Restored ProductReview ${_id}`);
        return {message: "Product review successfully restored"};
    },
});
