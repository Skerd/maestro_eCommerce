import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {collectionService} from "@eCommerceModule/database/schemas/collection/collection.service";
import {resolveStorefrontContext, inStorefrontCatalog} from "@coreModule/utilities/marketing/portalStorefront";
import {liveSellerCompanyClause} from "@eCommerceModule/utilities/shop/shopLiveSellers";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {notHiddenByPlatform} from "@coreModule/database/plugins/platformHiddenPlugin";
import {categoryDisplayName} from "@eCommerceModule/utilities/helpers/categoryName";
import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import type {ObjectId} from "mongodb";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
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
                usedCategoryTree({...companyFilter, status: "active", ...notHiddenByPlatform()}),
                collectionService.find({...companyFilter, isVisible: true}, {withDeleted: false}, undefined, "name slug", {name: 1}),
            ]);

            return {
                data: {
                    categories: categories.map((c: any) => ({
                        _id: c._id.toString(),
                        name: categoryDisplayName(c),
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

/**
 * The platform categories (D195) that live products in the scope use, with every ancestor so the menu stays a tree:
 * a shop sees only its own branches, the portal the branches any live shop sells in. One query per level up.
 */
async function usedCategoryTree(productFilter: Record<string, unknown>): Promise<IProductCategory[]> {
    const byId = new Map<string, IProductCategory>();
    let wanted: ObjectId[] = await productService.usedCategoryIds(productFilter);
    while (wanted.length > 0) {
        const rows = await categoryService.find({_id: {$in: wanted}}, {withDeleted: false}, undefined, "name names slug parent order");
        for (const row of rows) byId.set(String(row._id), row);
        wanted = rows.map((row) => nestedEntityToRef(row.parent)).filter((parent): parent is ObjectId => !!parent && !byId.has(String(parent)));
    }
    return [...byId.values()].sort((a, b) => categoryDisplayName(a).localeCompare(categoryDisplayName(b)));
}
