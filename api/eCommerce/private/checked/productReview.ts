import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {ProductReviewSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.schema-def";
import {createProductReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/createProductReview.form.validator";
import {editProductReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/editProductReview.form.validator";
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
            {
                $match: {
                    product: productId,
                }
            },
            {
                $group: {
                    _id: null,
                    avg: {
                        $avg: "$rating"
                    },
                    count: {
                        $sum: 1
                    }
                }
            },
        ],
        {...ctx, withDeleted: false},
    );
    const row = agg[0];
    const avg = row ? Math.round(Number(row.avg) * 10) / 10 : 0;
    const count = row ? Number(row.count) : 0;
    await productService.updateById(
        productId,
        {
            $set: {
                ratingAverage: avg,
                ratingCount: count,
                reviewCount: count
            }
        },
        ctx,
    );
}

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
    editSchema: editProductReviewFormSchema,
    toDTO: productReviewToDTO,
    toDTOArray: productReviewsToDTO,
    toSelect: productReviewsToSelect,
    buildCreateData: async ({order, product, rating, title, comment, actionUserCtx, company, session, logger, languageCode}) => {

        const orderDoc = await productOrderService.findOneOrThrow({
            _id: new ObjectId(order),
            company: company._id
        }, {withDeleted: false, session, logger, languageCode});

        const customerId = orderDoc.customer?._id;
        const actorIsCustomer = !!customerId && customerId.toString() === actionUserCtx.userId.toString();

        // Only the buyer reviews: a review is published under the buyer's name
        if (!customerId || !actorIsCustomer) {
            throw apiValidationException("only_customer_can_review", "", null, languageCode);
        }

        if (!["paid", "partially_refunded"].includes(orderDoc.paymentStatus)) {
            throw apiValidationException("order_must_be_paid_to_review", "", null, languageCode);
        }

        const lineHasProduct = orderDoc.items.some(item => item.product?._id?.toString() === product);
        if (!lineHasProduct) {
            throw apiValidationException("product_not_in_order", "", null, languageCode);
        }

        const existing = await productReviewService.findOne(
            {
                order: new ObjectId(order),
                product: new ObjectId(product)
            },
            {session, logger, languageCode, withDeleted: false},
        );
        if (existing) {
            throw apiValidationException("product_already_reviewed_for_order", "", null, languageCode);
        }

        return {
            order: new ObjectId(order),
            product: new ObjectId(product),
            rating,
            title: title?.trim(),
            comment: comment?.trim(),
            reviewer: customerId,
        };
    },
    buildUpdateData: buildUpdateDataFromSchemaDef(ProductReviewSchemaDef),
    afterCreate: async (created, params) => {
        const productId = created.product?._id;
        if (productId) {
            await productService.updateByIdOrThrow(
                productId,
                {
                    $push: {
                        reviews: created._id
                    }
                },
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
    afterUpdate: async (params, existing) => {
        if (params.rating == null || Number(params.rating) === existing.rating) return;
        if (!existing.product?._id) return;
        await recalculateProductRating(existing.product?._id, {
            session: params.session,
            logger: params.logger,
            languageCode: params.languageCode,
        });
    },
    beforeDelete: async (params) => {
        if (!params.actionUserCtx.isAdmin) {
            throw apiValidationException("only_admin_can_delete_review", "", null, params.languageCode);
        }
    },
    afterDelete: async (params, doc) => {
        const productId = doc.product?._id;
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

        const toRestore = await productReviewService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, withDeleted: true},
        );

        const orderId = toRestore.order?._id;
        const productId = toRestore.product?._id;
        const activeSibling = await productReviewService.findOne(
            {
                order: orderId,
                product: productId,
                company: company._id,
                _id: {
                    $ne: new ObjectId(_id)
                },
            },
            {session, logger, languageCode, withDeleted: false},
        );
        if (activeSibling) {
            throw apiValidationException(
                "cannot_restore_product_review_active_exists",
                "",
                null,
                languageCode,
            );
        }

        const restored = await productReviewService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const ratingProductId = restored.product?._id;
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
