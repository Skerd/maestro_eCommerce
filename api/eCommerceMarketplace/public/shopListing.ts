import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import User from "@coreModule/database/schemas/user/user";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import ListingAddOn from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn";
import ListingPackage from "@eCommerceModule/database/schemas/listingPackage/listingPackage";
import ProviderProfile from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {shopPromotionMap} from "@eCommerceModule/utilities/shop/shopMarketplaceFilter";
import {loadProviderProfileMetrics} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMetrics";
import {
    SHOP_LISTING_CARD_FIELDS,
    SHOP_LISTING_CARD_POPULATE,
    toShopListingCard,
    toShopListingDetail,
    toShopProviderProfile,
} from "@eCommerceModule/utilities/mappers/shopMarketplace/shopMarketplace.mapper";
import {
    shopMarketplaceIdFormSchema,
    type ShopMarketplaceIdFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.form.validator";
import type {ShopListingResponse} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.types";

export const basePath = "/api/eCommerceMarketplace/shopListing";
export const router = Router();

const RELATED_LIMIT = 8;
const CURRENCY_FIELDS = "symbol abbreviation decimalPlaces";

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopMarketplaceIdFormSchema),
    asyncHandler(async (params: any & ShopMarketplaceIdFormType): Promise<ShopListingResponse> => {
        const {languageCode, origin, logger, id} = params;
        const ctx = {logger, languageCode};

        const company = await resolveShopCompany(origin, languageCode);
        const listing: any = await Listing.findOne({_id: new ObjectId(id), company: company._id, status: "active"}).noDeleted()
            .populate(SHOP_LISTING_CARD_POPULATE)
            .lean();
        if (!listing) {
            throw apiValidationException("listing_not_found", null, null, languageCode);
        }

        const providerId = listing.provider._id;
        const [packages, addOns, user, profile, metrics, related, promotions] = await Promise.all([
            ListingPackage.find({listing: listing._id, company: company._id}).noDeleted()
                .select("name description price deliveryDays order")
                .populate("price.currency", CURRENCY_FIELDS)
                .sort({order: 1, "price.amount": 1})
                .lean(),
            ListingAddOn.find({listing: listing._id, company: company._id}).noDeleted()
                .select("name price deliveryDays")
                .populate("price.currency", CURRENCY_FIELDS)
                .sort({"price.amount": 1})
                .lean(),
            User.findById(providerId).select("name surname createdAt").lean(),
            ProviderProfile.findOne({user: providerId, company: company._id}).noDeleted()
                .select("bio skills availability portfolio")
                .lean(),
            loadProviderProfileMetrics(providerId, company._id, ctx),
            listing.category
                ? Listing.find({
                    company: company._id,
                    status: "active",
                    category: listing.category._id,
                    _id: {$ne: listing._id},
                }).noDeleted()
                    .select(SHOP_LISTING_CARD_FIELDS)
                    .populate(SHOP_LISTING_CARD_POPULATE)
                    .sort({avgRating: -1, createdAt: -1})
                    .limit(RELATED_LIMIT)
                    .lean()
                : [],
            shopPromotionMap(company._id, ctx),
        ]);

        const provider = user ? toShopProviderProfile(user, profile, metrics) : undefined;
        return {
            data: toShopListingDetail(
                listing,
                packages,
                addOns,
                provider,
                related.map((item) => toShopListingCard(item, promotions)),
                promotions,
            ),
        };
    }),
);
