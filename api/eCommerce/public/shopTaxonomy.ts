import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import Category from "@eCommerceModule/database/schemas/category/category";
import Collection from "@eCommerceModule/database/schemas/collection/collection";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import type {ShopTaxonomyResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopTaxonomy";
export const router = Router();

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any): Promise<ShopTaxonomyResponse> => {
        const {languageCode, origin} = params;

        const company = await resolveShopCompany(origin, languageCode);

        const [categories, collections] = await Promise.all([
            Category.find({company: company._id, deletedAt: null}).select("name slug parent").sort({name: 1}).lean(),
            Collection.find({company: company._id, deletedAt: null, isVisible: true}).select("name slug").sort({name: 1}).lean(),
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
    }),
);
