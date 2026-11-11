import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {resolveStorefrontContext, inStorefrontCatalog} from "@coreModule/utilities/marketing/portalStorefront";
import {toShopProductCard} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {PORTAL_CURRENCY_SELECT} from "@coreModule/utilities/mappers/portal/portalStorefrontMapper.dto";
import {buildShopCatalogFilter, refineShopCatalogFilter, SHOP_PRODUCT_SORT_SPECS} from "@eCommerceModule/utilities/shop/shopCatalogFilter";
import {
    shopProductsFormSchema,
    type ShopProductsFormType,
} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {ShopProductsResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";
import {liveSellerScope} from "@eCommerceModule/utilities/shop/shopLiveSellers";

export const basePath = "/api/eCommerce/shopProducts";
export const router = Router();

const CARD_FIELDS = "title slug type price compareAtPrice mainImage badges featured ratingAverage ratingCount hasVariants company currency";

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductsFormSchema),
    asyncHandler(async (params: any & ShopProductsFormType): Promise<ShopProductsResponse> => {
        const {
            languageCode,
            origin,
            search,
            categorySlug,
            categoryIds,
            collectionSlug,
            collectionId,
            sort,
            page = 1,
            limit = 24,
        } = params;

        const ctx = await resolveStorefrontContext(origin, languageCode);
        return inStorefrontCatalog(ctx, async () => {
            const companyId = ctx.mode === "tenant" ? ctx.company._id : await liveSellerScope(params.sellerCompanyId);
            const filter = await buildShopCatalogFilter({
                companyId,
                search,
                categorySlug,
                categoryIds,
                collectionSlug,
                collectionId,
            });
            if (!filter) return {data: [], total: 0, page, limit};

            await refineShopCatalogFilter(filter, {
                priceMin: params.priceMin,
                priceMax: params.priceMax,
                inStock: params.inStock,
                onSale: params.onSale,
                brands: params.brands,
                types: params.types,
                attributes: params.attributes,
                minRating: params.minRating,
            });

            const sortSpec = (sort && SHOP_PRODUCT_SORT_SPECS[sort]) || SHOP_PRODUCT_SORT_SPECS.newest;

            const [products, total] = await Promise.all([
                productService.find(filter, {withDeleted: false}, [{path: "company", select: "name logo siteSlug siteHost"}, {path: "currency", select: PORTAL_CURRENCY_SELECT}], CARD_FIELDS, sortSpec, limit, (page - 1) * limit),
                productService.count(filter, {withDeleted: false}),
            ]);

            return {data: products.map(toShopProductCard), total, page, limit};

        });
    }),
);
