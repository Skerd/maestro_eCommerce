import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import Product from "@eCommerceModule/database/schemas/product/product";
import Category from "@eCommerceModule/database/schemas/category/category";
import Collection from "@eCommerceModule/database/schemas/collection/collection";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {toShopProductCard} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {shopProductsFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {ShopProductsResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopProducts";
export const router = Router();

const SORTS: Record<string, Record<string, 1 | -1>> = {
    newest: {createdAt: -1},
    priceAsc: {price: 1},
    priceDesc: {price: -1},
    featured: {featured: -1, createdAt: -1},
};

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductsFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductsResponse> => {
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

        const company = await resolveShopCompany(origin, languageCode);

        const filter: Record<string, unknown> = {
            company: company._id,
            status: "active",
            deletedAt: null,
        };

        if (search) {
            filter.title = {$regex: escapeRegex(String(search).trim()), $options: "i"};
        }

        if (Array.isArray(categoryIds) && categoryIds.length > 0) {
            const categories = await Category.find({company: company._id, _id: {$in: categoryIds}}, {_id: 1});
            if (categories.length === 0) return {data: [], total: 0, page, limit};
            filter.categories = {$in: categories.map((category) => category._id)};
        } else if (categorySlug) {
            const category = await Category.findOne({company: company._id, slug: String(categorySlug).toLowerCase()}, {_id: 1});
            if (!category) return {data: [], total: 0, page, limit};
            filter.categories = category._id;
        }

        if (collectionId) {
            const collection = await Collection.findOne({company: company._id, _id: collectionId}, {_id: 1, products: 1});
            if (!collection) return {data: [], total: 0, page, limit};
            filter._id = {$in: collection.products ?? []};
        } else if (collectionSlug) {
            const collection = await Collection.findOne({company: company._id, slug: String(collectionSlug).toLowerCase()}, {_id: 1, products: 1});
            if (!collection) return {data: [], total: 0, page, limit};
            filter._id = {$in: collection.products ?? []};
        }

        const sortSpec = SORTS[sort as string] ?? SORTS.newest;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .select("title slug type price compareAtPrice mainImage badges featured ratingAverage ratingCount hasVariants")
                .sort(sortSpec)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter),
        ]);

        return {data: products.map(toShopProductCard), total, page, limit};
    }),
);
