import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {z} from "zod";
import {createProductReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/createProductReview.form.validator";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {
    productReviewToDTO,
    productReviewsToDTO,
} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.dto";
import {productReviewsToSelect} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.select";

/**
 * Ratings are system-computed denormalizations on the product (schema-def
 * marks them as such) — recomputed on every review create/delete/restore.
 */
async function recalculateProductRating(productId: ObjectId, ctx: CrudOptions): Promise<void> {
    const agg = await productReviewService.aggregate(
        [
            {$match: {product: productId, deletedAt: null}},
            {$group: {_id: null, avg: {$avg: "$rating"}, count: {$sum: 1}}},
        ],
        ctx,
    );
    const row = agg[0];
    const avg = row ? Math.round(Number(row.avg) * 10) / 10 : 0;
    const count = row ? Number(row.count) : 0;
    await productService.updateById(
        productId,
        {$set: {ratingAverage: avg, ratingCount: count, reviewCount: count}},
        ctx,
    );
}

function productIdFromReview(doc: {product?: unknown}): ObjectId | undefined {
    return nestedEntityToRef(doc.product);
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
    createSchema: createProductReviewFormSchema,
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: productReviewToDTO,
    toDTOArray: productReviewsToDTO,
    toSelect: productReviewsToSelect,
    buildCreateData: async ({orderId, productId, rating, title, comment, actionUserCtx, company, session, logger, languageCode}) => {
        const order = await productOrderService.findOne(
            {_id: new ObjectId(orderId), company: company._id, deletedAt: null},
            {session, logger, languageCode},
        );
        if (!order) {
            throw apiValidationException("order_not_found", null, null, languageCode);
        }

        const customerId = nestedEntityToRef(order.customer);
        if (!customerId || customerId.toString() !== actionUserCtx.userId.toString()) {
            throw apiValidationException("only_customer_can_review", null, null, languageCode);
        }

        if (!REVIEWABLE_PAYMENT_STATUSES.includes(order.paymentStatus)) {
            throw apiValidationException("order_must_be_paid_to_review", null, null, languageCode);
        }

        const lineHasProduct = order.items.some(item => nestedEntityToRef(item.product)?.toString() === productId);
        if (!lineHasProduct) {
            throw apiValidationException("product_not_in_order", null, null, languageCode);
        }

        const existing = await productReviewService.findOne(
            {order: new ObjectId(orderId), product: new ObjectId(productId)},
            {session, logger, languageCode, withDeleted: false},
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
            await productService.updateByIdOrThrow(
                productId,
                {$push: {reviews: created._id}},
                {
                    session: params.session,
                    logger: params.logger,
                    languageCode: params.languageCode,
                    auditUserId: params.actionUserCtx.userId,
                    auditAction: "create",
                },
            );
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
            await productService.updateByIdOrThrow(
                productId,
                {$pull: {reviews: doc._id}},
                {
                    session: params.session,
                    logger: params.logger,
                    languageCode: params.languageCode,
                    auditUserId: params.actionUserCtx.userId,
                },
            );
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

        const toRestore = await productReviewService.findOne(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, withDeleted: true},
        );
        if (!toRestore) {
            throw apiValidationException("not_found", null, null, languageCode);
        }

        const orderId = nestedEntityToRef(toRestore.order);
        const productId = nestedEntityToRef(toRestore.product);
        const activeSibling = await productReviewService.findOne(
            {
                order: orderId,
                product: productId,
                company: company._id,
                _id: {$ne: new ObjectId(_id)},
            },
            {session, logger, languageCode, withDeleted: false},
        );
        if (activeSibling) {
            throw apiValidationException(
                "cannot_restore_product_review_active_exists",
                null,
                null,
                languageCode,
            );
        }

        const restored = await productReviewService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const ratingProductId = productIdFromReview(restored);
        if (ratingProductId) {
            await productService.updateByIdOrThrow(
                ratingProductId,
                {$push: {reviews: restored._id}},
                {session, logger, languageCode, auditUserId: actionUserCtx.userId, auditAction: "restore"},
            );
            await recalculateProductRating(ratingProductId, {session, logger, languageCode});
        }

        logger.finish(`Restored ProductReview ${_id}`);
        return {message: "Product review successfully restored"};
    },
});
