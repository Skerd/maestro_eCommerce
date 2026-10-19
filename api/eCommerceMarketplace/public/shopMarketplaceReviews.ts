import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import Order from "@eCommerceModule/database/schemas/order/order";
import Review from "@eCommerceModule/database/schemas/review/review";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {toShopMarketplaceReview} from "@eCommerceModule/utilities/mappers/shopMarketplace/shopMarketplace.mapper";
import {
    shopMarketplaceReviewsFormSchema,
    type ShopMarketplaceReviewsFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.form.validator";
import type {ShopMarketplaceReviewsResponse} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.types";

export const basePath = "/api/eCommerceMarketplace/shopMarketplaceReviews";
export const router = Router();

/**
 * Reviews of one active listing, or of every order a provider with an active
 * listing delivered (listing and task-request orders alike).
 */
router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopMarketplaceReviewsFormSchema),
    asyncHandler(async (params: any & ShopMarketplaceReviewsFormType): Promise<ShopMarketplaceReviewsResponse> => {
        const {languageCode, origin, listingId, providerId, page = 1, limit = 10} = params;

        const company = await resolveShopCompany(origin, languageCode);
        const active = {company: company._id, status: "active"};

        let filter: Record<string, unknown>;
        if (listingId) {
            if (!(await Listing.findOne({...active, _id: new ObjectId(listingId)}).noDeleted().select("_id").lean())) {
                throw apiValidationException("listing_not_found", null, null, languageCode);
            }
            filter = {company: company._id, listing: new ObjectId(listingId)};
        } else {
            const provider = new ObjectId(providerId);
            if (!(await Listing.findOne({...active, provider}).noDeleted().select("_id").lean())) {
                throw apiValidationException("provider_not_found", null, null, languageCode);
            }
            const orders = await Order.find({company: company._id, provider}).noDeleted().select("_id").lean();
            filter = {company: company._id, order: {$in: orders.map((order) => order._id)}};
        }

        const [reviews, total] = await Promise.all([
            Review.find(filter).noDeleted()
                .select("rating comment reviewer listing createdAt")
                .populate("reviewer", "name surname")
                .populate("listing", "title")
                .sort({createdAt: -1})
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter).noDeleted(),
        ]);

        return {data: reviews.map(toShopMarketplaceReview), total};
    }),
);
