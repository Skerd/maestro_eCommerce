import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {collectionService} from "@eCommerceModule/database/schemas/collection/collection.service";
import {resolveStorefrontContext, inStorefrontCatalog} from "@coreModule/utilities/marketing/portalStorefront";
import {liveSellerCompanyClause} from "@eCommerceModule/utilities/shop/shopLiveSellers";
import type {ShopTaxonomyResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopTaxonomy";
export const router = Router();

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any): Promise<ShopTaxonomyResponse> => {
        const {languageCode, origin} = params;

        const ctx = await resolveStorefrontContext(origin, languageCode);
        return inStorefrontCatalog(ctx, async () => {
            const companyFilter = ctx.mode === "tenant"
                ? {company: ctx.company._id}
                : await liveSellerCompanyClause();

            const [categories, collections] = await Promise.all([
                categoryService.find(companyFilter, {withDeleted: false}, undefined, "name slug parent", {name: 1}),
                collectionService.find({...companyFilter, isVisible: true}, {withDeleted: false}, undefined, "name slug", {name: 1}),
            ]);

            return {
                data: {
                    categories: categories.map((c: any) => ({
                        _id: c._id.toString(),
                        name: c.name ?? "",
                        slug: c.slug ?? "",
                        parent: c.parent ? (c.parent._id ?? c.parent).toString() : undefined,
                    })),
                    collections: collections.map((c: any) => ({
                        _id: c._id.toString(),
                        title: c.name ?? "",
                        slug: c.slug ?? "",
                    })),
                },
            };

        });
    }),
);
