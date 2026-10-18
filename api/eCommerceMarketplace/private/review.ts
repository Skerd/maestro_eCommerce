import {ObjectId, type ClientSession} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createReviewFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/review/createReview.form.validator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {CreateReviewFormType} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/review/review.schema-def";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import Review, {type IReview} from "@eCommerceModule/database/schemas/review/review";
import {reviewService} from "@eCommerceModule/database/schemas/review/review.service";
import {reviewToDTO, reviewsToDTO} from "@eCommerceModule/utilities/mappers/review/reviewMapper.dto";
import {reviewsToSelect} from "@eCommerceModule/utilities/mappers/review/reviewMapper.select";
import {isOrderParty} from "@eCommerceModule/utilities/services/marketplaceAccess";
import {restoreUnlessKeyTaken} from "@eCommerceModule/utilities/services/restoreUnlessKeyTaken";
import type {serverLogger} from "@coreModule/loggers/serverLog";

/** Recomputes a listing's average rating and review count from its live reviews. */
async function recalculateListingRating(
    review: IReview,
    ctx: {session: ClientSession; logger: serverLogger; languageCode: string},
): Promise<void> {
    if (!review.listing) return;
    const listingId = review.listing._id;

    // An aggregate skips the soft-delete filter, and restore writes deletedAt: null
    const agg = await reviewService.aggregate(
        [
            {$match: {listing: listingId, deletedAt: null}},
            {$group: {_id: null, avg: {$avg: "$rating"}, count: {$sum: 1}}},
        ],
        ctx,
    );
    const avg = agg.length > 0 ? Math.round(agg[0].avg * 10) / 10 : 0;
    const count = agg.length > 0 ? agg[0].count : 0;
    await listingService.updateById(listingId, {$set: {avgRating: avg, reviewCount: count}}, ctx);
}

export const basePath = "/api/eCommerceMarketplace/review";
export const {router} = createCrudRouter<IReview, CreateReviewFormType>({
    collectionName: "reviews",
    model: Review,
    service: reviewService,
    entityName: "Review",
    defaultSort: {createdAt: -1},
    selectSearchField: "comment",
    rateLimits: {read: 60, write: 30, delete: 20},
    createSchema: createReviewFormSchema,
    // Not edited via PATCH; create-only with admin delete/restore
    editSchema: validateSingleForm,
    toDTO: reviewToDTO,
    toDTOArray: reviewsToDTO,
    toSelect: reviewsToSelect,
    /** The customer reviews a completed order once; listing and reviewer are derived server-side. */
    buildCreateData: async ({order: orderRef, rating, comment, actionUserCtx, company, session, logger, languageCode}) => {
        const opts = {session, logger, languageCode};
        const order = await orderService.findOneOrThrow({_id: new ObjectId(orderRef), company: company._id}, opts);

        if (order.status !== "completed") {
            throw apiValidationException("order_must_be_completed_to_review", null, null, languageCode);
        }
        if (!isOrderParty(order, actionUserCtx.userId, "customer")) {
            throw apiValidationException("only_customer_can_review", null, null, languageCode);
        }
        if (await reviewService.findOne({order: order._id, company: company._id}, opts, null, "_id")) {
            throw apiValidationException("order_already_reviewed", null, null, languageCode);
        }

        return {
            order: order._id,
            ...(order.listing && {listing: order.listing._id}),
            rating,
            comment: comment ?? "",
            reviewer: new ObjectId(actionUserCtx.userId),
        };
    },
    buildUpdateData: () => ({}),
    afterCreate: async (created, params) => {
        await recalculateListingRating(created, params);
    },
    beforeDelete: async (params, doc) => {
        if (!params.actionUserCtx.isAdmin) {
            throw apiValidationException("only_admin_can_delete_review", null, null, params.languageCode);
        }
        await assertCanDelete(Review.modelName, doc._id, params.languageCode, params.session);
    },
    afterDelete: async (params, doc) => {
        await recalculateListingRating(doc, params);
    },
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: Review,
        service: reviewService,
        entityName: "Review",
        keys: ["order"],
        errorCode: "order_already_reviewed",
        afterRestore: (deleted, params) => recalculateListingRating(deleted, params),
    }),
});
