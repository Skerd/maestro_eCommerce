import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import CmsBlock from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import {cmsBlocksToDTO} from "@eCommerceModule/utilities/mappers/cmsBlockMapper.dto";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";

/**
 * GET /api/eCommerce/cmsBlock/public — the route sinfonia's useCmsBlocks
 * already expects. Merges with the private cmsBlock CRUD router (route
 * registry merges routers that share a basePath).
 */
export const basePath = "/api/eCommerce/cmsBlock";
export const router = Router();

router.get(
    "/public",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (params: any) => {
        const {languageCode, origin} = params;

        const company = await resolveShopCompany(origin, languageCode);

        const now = new Date();
        const blocks = await CmsBlock.find({
            company: company._id,
            isActive: true,
            deletedAt: null,
            $and: [
                {$or: [{startsAt: null}, {startsAt: {$lte: now}}]},
                {$or: [{endsAt: null}, {endsAt: {$gte: now}}]},
            ],
        }).sort({position: 1});

        return {data: cmsBlocksToDTO(blocks)};
    }),
);
