import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import User from "@coreModule/database/schemas/user/user";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import ProviderProfile from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {shopPromotionMap} from "@eCommerceModule/utilities/shop/shopMarketplaceFilter";
import {loadProviderProfileMetrics} from "@eCommerceModule/utilities/mappers/providerProfile/providerProfileMetrics";
import {
    SHOP_LISTING_CARD_FIELDS,
    SHOP_LISTING_CARD_POPULATE,
    toShopListingCard,
    toShopProviderProfile,
} from "@eCommerceModule/utilities/mappers/shopMarketplace/shopMarketplace.mapper";
import {
    shopMarketplaceIdFormSchema,
    type ShopMarketplaceIdFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.form.validator";
import type {ShopProviderResponse} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.types";

export const basePath = "/api/eCommerceMarketplace/shopProvider";
export const router = Router();

const LISTINGS_LIMIT = 48;

/** A provider's public page; only users offering at least one active listing in the shop have one. */
router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopMarketplaceIdFormSchema),
    asyncHandler(async (params: any & ShopMarketplaceIdFormType): Promise<ShopProviderResponse> => {
        const {languageCode, origin, logger, id} = params;
        const ctx = {logger, languageCode};

        const company = await resolveShopCompany(origin, languageCode);
        const providerId = new ObjectId(id);

        const listings = await Listing.find({company: company._id, status: "active", provider: providerId}).noDeleted()
            .select(SHOP_LISTING_CARD_FIELDS)
            .populate(SHOP_LISTING_CARD_POPULATE)
            .sort({createdAt: -1})
            .limit(LISTINGS_LIMIT)
            .lean();
        const user = listings.length > 0
            ? await User.findOne({_id: providerId, companies: company._id}).select("name surname createdAt").lean()
            : null;
        if (!user) {
            throw apiValidationException("provider_not_found", null, null, languageCode);
        }

        const [profile, metrics, promotions] = await Promise.all([
            ProviderProfile.findOne({user: providerId, company: company._id}).noDeleted()
                .select("bio skills availability portfolio")
                .lean(),
            loadProviderProfileMetrics(providerId, company._id, ctx),
            shopPromotionMap(company._id, ctx),
        ]);

        return {
            data: {
                provider: toShopProviderProfile(user, profile, metrics),
                listings: listings.map((listing) => toShopListingCard(listing, promotions)),
            },
        };
    }),
);
