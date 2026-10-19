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
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
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
        const opts = {logger, languageCode};

        const ctx = await resolveShopContext(origin, languageCode);
        const listingFilter: Record<string, unknown> = {_id: new ObjectId(id), status: "active"};
        if (ctx.mode === "tenant") listingFilter.company = ctx.company._id;

        const listing: any = await Listing.findOne(listingFilter).noDeleted()
            .populate(SHOP_LISTING_CARD_POPULATE)
            .lean();
        if (!listing) {
            throw apiValidationException("listing_not_found", null, null, languageCode);
        }

        const sellerCompanyId = ctx.mode === "tenant"
            ? ctx.company._id
            : (listing.company?._id ?? listing.company);
        const providerId = listing.provider._id ?? listing.provider;
        const [packages, addOns, user, profile, metrics, related, promotions] = await Promise.all([
            ListingPackage.find({listing: listing._id, company: sellerCompanyId}).noDeleted()
                .select("name description price deliveryDays order")
                .populate("price.currency", CURRENCY_FIELDS)
                .sort({order: 1, "price.amount": 1})
                .lean(),
            ListingAddOn.find({listing: listing._id, company: sellerCompanyId}).noDeleted()
                .select("name price deliveryDays")
                .populate("price.currency", CURRENCY_FIELDS)
                .sort({"price.amount": 1})
                .lean(),
            User.findById(providerId).select("name surname createdAt").lean(),
            ProviderProfile.findOne({user: providerId, company: sellerCompanyId}).noDeleted()
                .select("bio skills availability portfolio")
                .lean(),
            loadProviderProfileMetrics(providerId, sellerCompanyId, opts),
            listing.category
                ? Listing.find({
                    company: sellerCompanyId,
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
            shopPromotionMap(sellerCompanyId, opts),
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
