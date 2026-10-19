import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {buildShopListingFilter, shopPromotionMap} from "@eCommerceModule/utilities/shop/shopMarketplaceFilter";
import {
    SHOP_LISTING_CARD_FIELDS,
    SHOP_LISTING_CARD_POPULATE,
    toShopListingCard,
} from "@eCommerceModule/utilities/mappers/shopMarketplace/shopMarketplace.mapper";
import {
    shopListingsFormSchema,
    type ShopListingSort,
    type ShopListingsFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.form.validator";
import type {ShopListingsResponse} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/public/shopMarketplace/shopMarketplace.types";

export const basePath = "/api/eCommerceMarketplace/shopListings";
export const router = Router();

const NEWEST: Record<string, 1 | -1> = {createdAt: -1};

const SORTS: Record<Exclude<ShopListingSort, "recommended">, Record<string, 1 | -1>> = {
    newest: NEWEST,
    priceAsc: {price: 1, createdAt: -1},
    priceDesc: {price: -1, createdAt: -1},
    rating: {avgRating: -1, reviewCount: -1, createdAt: -1},
};

function findCards(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, skip: number, limit: number) {
    return Listing.find(filter).noDeleted()
        .select(SHOP_LISTING_CARD_FIELDS)
        .populate(SHOP_LISTING_CARD_POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
}

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopListingsFormSchema),
    asyncHandler(async (params: any & ShopListingsFormType): Promise<ShopListingsResponse> => {
        const {languageCode, origin, logger, sort = "recommended", page = 1, limit = 24} = params;

        const ctx = await resolveShopContext(origin, languageCode);
        const companyId = ctx.mode === "tenant" ? ctx.company._id : undefined;
        const filter = await buildShopListingFilter(companyId, params);
        if (!filter) return {data: [], total: 0, page, limit};

        const promotions = await shopPromotionMap(companyId, {logger, languageCode});
        const skip = (page - 1) * limit;

        if (sort !== "recommended" || promotions.size === 0) {
            const [listings, total] = await Promise.all([
                findCards(filter, sort === "recommended" ? NEWEST : SORTS[sort as keyof typeof SORTS], skip, limit),
                Listing.countDocuments(filter).noDeleted(),
            ]);
            return {data: listings.map((listing) => toShopListingCard(listing, promotions)), total, page, limit};
        }

        // Recommended: listings with a running promotion first, then the rest, newest first in each band
        const promotedIds = [...promotions.keys()].map((id) => new ObjectId(id));
        const promotedFilter = {...filter, _id: {$in: promotedIds}};
        const otherFilter = {...filter, _id: {$nin: promotedIds}};
        const [promotedTotal, otherTotal] = await Promise.all([
            Listing.countDocuments(promotedFilter).noDeleted(),
            Listing.countDocuments(otherFilter).noDeleted(),
        ]);

        const promoted = skip < promotedTotal ? await findCards(promotedFilter, NEWEST, skip, limit) : [];
        const remaining = limit - promoted.length;
        const others = remaining > 0
            ? await findCards(otherFilter, NEWEST, Math.max(0, skip - promotedTotal), remaining)
            : [];

        return {
            data: [...promoted, ...others].map((listing) => toShopListingCard(listing, promotions)),
            total: promotedTotal + otherTotal,
            page,
            limit,
        };
    }),
);
