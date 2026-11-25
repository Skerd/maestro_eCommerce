import {ObjectId} from "mongodb";
import {createCrudRouter, selectIdsOf, type CrudCreateParams} from "@coreModule/api/crudRouterFactory";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {isPortalPurchase} from "@coreModule/utilities/marketing/portalStorefront";
import {productOrderSeller} from "@eCommerceModule/utilities/shop/shopBuyerTarget";
import {shopPurchaseRoute} from "@eCommerceModule/utilities/shop/shopPurchase";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {refreshProductRating} from "@eCommerceModule/workflows/productRating";
import {ProductReviewSchemaDef, type CreateProductReviewFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.schema-def";
import {createProductReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/createProductReview.form.validator";
import {editProductReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/editProductReview.form.validator";
import ProductReview, {type IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {
    productReviewToDTO,
    productReviewsToDTO,
} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.dto";
import {productReviewsToSelect} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.select";

/**
 * The one review create (BE-02): the order's customer reviews a product of their paid order, once per order line, and
 * the review is published under their name in the order's company. `orderScope` narrows the order lookup: the
 * request's company for the panel create, the buyer's own orders for `createMine` (on the portal, every seller's).
 */
async function buildProductReviewCreate(
    {order, product, rating, title, comment, actionUserCtx, session, logger, languageCode}: CrudCreateParams<CreateProductReviewFormType>,
    orderScope: Record<string, unknown>,
) {
    const orderDoc = await productOrderService.findOneOrThrow(
        {_id: new ObjectId(order), ...orderScope},
        {withDeleted: false, session, logger, languageCode},
        undefined,
        undefined,
        apiValidationException("order_not_found", "order", null, languageCode),
    );

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
            order: orderDoc._id,
            product: new ObjectId(product)
        },
        {session, logger, languageCode, withDeleted: false},
    );
    if (existing) {
        throw apiValidationException("product_already_reviewed_for_order", "", null, languageCode);
    }

    return {
        company: nestedEntityToRef(orderDoc.company),
        order: orderDoc._id,
        product: new ObjectId(product),
        rating,
        title: title?.trim(),
        comment: comment?.trim(),
        reviewer: customerId,
    };
}

/** Lists a new review on its product and refreshes the product's stored rating. */
async function addReviewToProduct(created: IProductReview, {session, logger, languageCode, actionUserCtx}: TransactionRequiredParams): Promise<void> {
    const productId = created.product?._id;
    if (!productId) return;
    await productService.updateByIdOrThrow(
        productId,
        {
            $push: {
                reviews: created._id
            }
        },
        {session, logger, languageCode, auditUserId: actionUserCtx.userId, auditAction: "create"},
    );
    await refreshProductRating(productId, {session, logger, languageCode});
}

const buildProductReviewUpdate = buildUpdateDataFromSchemaDef(ProductReviewSchemaDef);

export const basePath = "/api/eCommerce/productReview";
export const {router} = createCrudRouter<IProductReview, CreateProductReviewFormType>({
    collectionName: "productReviews",
    model: ProductReview,
    service: productReviewService,
    entityName: "ProductReview",
    defaultSort: {createdAt: -1},
    // A review reads as the rating, who wrote it and the product (D162: the chat's "Share a record" list), so the
    // select populates both; the search matches the review's own title and comment.
    overrideSelectHandler: async (params) => {
        const {logger, languageCode, actionUserCtx, company, name, page, limit, dslFilterQuery} = params;
        logger.start("Fetching product reviews for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(
            ProductReview,
            {rating: {}, title: {}, comment: {}, product: {keys: {title: {}}}, reviewer: {keys: {name: {}, surname: {}}}},
            "read", actionUserCtx, languageCode,
        );
        const populate = SchemaGuard.generatePopulate(sanitizedFields, ProductReview.schema);

        const filter: Record<string, unknown> = {company: company._id};
        const ids = selectIdsOf(params);
        if (ids.length > 0) {
            filter._id = {$in: ids};
        } else {
            const search = String(name ?? "").trim();
            if (search) {
                const searchable = ["title", "comment"].filter((field) => sanitizedFields[field]);
                if (searchable.length === 0) return {data: [], total: 0};
                filter.$or = searchable.map((field) => ({[field]: {$regex: escapeRegex(search), $options: "i"}}));
            }
            if (dslFilterQuery && Object.keys(dslFilterQuery as object).length > 0) filter.$and = [dslFilterQuery];
        }

        const [reviews, total] = await Promise.all([
            productReviewService.find(filter, {logger, languageCode}, populate.populate, populate.select || "", {createdAt: -1}, limit, (page - 1) * limit),
            productReviewService.count(filter, {logger, languageCode}),
        ]);
        logger.finish("Finished fetching product reviews for select!");
        return {data: productReviewsToSelect(reviews), total};
    },
    rateLimits: {read: 60, write: 30, delete: 20},
    createSchema: createProductReviewFormSchema,
    editSchema: editProductReviewFormSchema,
    toDTO: productReviewToDTO,
    toDTOArray: productReviewsToDTO,
    toSelect: productReviewsToSelect,
    buildCreateData: (params) => buildProductReviewCreate(params, {company: params.company._id}),
    // The rating, title and comment are the buyer's words: only the reviewer changes them, never the shop's staff.
    buildUpdateData: (params, writeFields) => {
        if (String(nestedEntityToRef(params.existing.reviewer)) !== String(params.actionUserCtx.userId)) {
            throw apiValidationException("only_reviewer_can_edit_review", "", null, params.languageCode);
        }
        return buildProductReviewUpdate(params, writeFields);
    },
    afterCreate: (created, params) => addReviewToProduct(created, params),
    afterUpdate: async (params, existing) => {
        if (params.rating == null || Number(params.rating) === existing.rating) return;
        if (!existing.product?._id) return;
        await refreshProductRating(existing.product?._id, {
            session: params.session,
            logger: params.logger,
            languageCode: params.languageCode,
        });
    },
});

/**
 * The buyer's own review (storefront account, product page): the same rules as PUT, without the model permission. On
 * the portal the buyer's session is the platform's while the order is its seller's, so the order is found among the
 * buyer's own across sellers and the review is written in the order's company (D16).
 */
router.put(
    "/createMine",
    authMW("private", {portalBuyer: productOrderSeller}),
    rateLimiter({windowMs: 60000, max: 30}),
    transactionHandler(),
    validateFormZod(createProductReviewFormSchema),
    asyncHandler(shopPurchaseRoute(async (params: CrudCreateParams<CreateProductReviewFormType>) => {
        const {company, actionUserCtx, session, logger, languageCode, origin} = params;
        const ownOrders = {
            customer: new ObjectId(actionUserCtx.userId),
            ...(!isPortalPurchase(origin) && {company: company._id}),
        };
        const created = await productReviewService.create(
            await buildProductReviewCreate(params, ownOrders),
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
        await addReviewToProduct(created, params);
        return {data: {_id: created._id.toString()}};
    })),
);
