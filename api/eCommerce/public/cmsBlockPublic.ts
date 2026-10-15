import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import CmsBlock from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import {cmsBlocksToDTO} from "@eCommerceModule/utilities/mappers/cmsBlock/cmsBlockMapper.dto";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {sanitizeCmsHtml} from "@eCommerceModule/utilities/shop/cmsHtmlSanitizer";

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
            $and: [
                {$or: [{startsAt: null}, {startsAt: {$lte: now}}]},
                {$or: [{endsAt: null}, {endsAt: {$gte: now}}]},
            ],
        }).noDeleted().sort({position: 1});

        const data = cmsBlocksToDTO(blocks).map(block =>
            block.config?.html ? {...block, config: {...block.config, html: sanitizeCmsHtml(block.config.html)}} : block,
        );
        return {data};
    }),
);
