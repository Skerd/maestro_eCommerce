import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import Product from "@eCommerceModule/database/schemas/product/product";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {SHOP_CURRENCY_SELECT, toShopProductCard} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {buildShopCatalogFilter, refineShopCatalogFilter} from "@eCommerceModule/utilities/shop/shopCatalogFilter";
import {
    shopProductsFormSchema,
    type ShopProductSort,
    type ShopProductsFormType,
} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {ShopProductsResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopProducts";
export const router = Router();

const SORTS: Record<ShopProductSort, Record<string, 1 | -1>> = {
    newest: {createdAt: -1},
    priceAsc: {price: 1},
    priceDesc: {price: -1},
    featured: {featured: -1, createdAt: -1},
};

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

        const ctx = await resolveShopContext(origin, languageCode);
        const companyId = ctx.mode === "tenant" ? ctx.company._id : undefined;
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

        const sortSpec = (sort && SORTS[sort]) || SORTS.newest;

        const [products, total] = await Promise.all([
            Product.find(filter).noDeleted()
                .select(CARD_FIELDS)
                .populate("company", "name logo shopSlug shopHost")
                .populate("currency", SHOP_CURRENCY_SELECT)
                .sort(sortSpec)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter).noDeleted(),
        ]);

        return {data: products.map(toShopProductCard), total, page, limit};
    }),
);
