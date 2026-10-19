import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductAttribute from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {buildShopCatalogFilter} from "@eCommerceModule/utilities/shop/shopCatalogFilter";
import {productTypes} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {shopFacetsFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {
    ShopFacetGroup,
    ShopFacetOption,
    ShopFacets,
    ShopFacetsResponse,
} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopFacets";
export const router = Router();

const TYPE_ORDER = new Map<string, number>(productTypes.map((type, index) => [type, index]));
const BRAND_ATTRIBUTE = "brand";

function emptyFacets(): ShopFacets {
    return {total: 0, brands: [], types: [], attributes: [], inStock: 0, onSale: 0, rated: 0};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function readCount(rows: unknown): number {
    if (!Array.isArray(rows) || !isRecord(rows[0]) || typeof rows[0].count !== "number") return 0;
    return rows[0].count;
}

function readPrice(rows: unknown): {min?: number; max?: number} {
    if (!Array.isArray(rows) || !isRecord(rows[0])) return {};
    const min = rows[0].min;
    const max = rows[0].max;
    return {
        min: typeof min === "number" ? min : undefined,
        max: typeof max === "number" ? max : undefined,
    };
}

function readBuckets(rows: unknown): ShopFacetOption[] {
    if (!Array.isArray(rows)) return [];
    const buckets: ShopFacetOption[] = [];
    for (const row of rows) {
        if (!isRecord(row) || typeof row._id !== "string" || row._id === "" || typeof row.count !== "number") continue;
        buckets.push({value: row._id, count: row.count});
    }
    return buckets;
}

function readAttributeRows(rows: unknown): {name: string; value: string; count: number}[] {
    if (!Array.isArray(rows)) return [];
    const parsed: {name: string; value: string; count: number}[] = [];
    for (const row of rows) {
        if (!isRecord(row) || typeof row.count !== "number" || !isRecord(row._id)) continue;
        const name = row._id.name;
        const value = row._id.value;
        if (typeof name !== "string" || typeof value !== "string" || !name || !value) continue;
        parsed.push({name, value, count: row.count});
    }
    return parsed;
}

function addOption(groups: Map<string, Map<string, number>>, name: string, value: string, count: number) {
    const values = groups.get(name) ?? new Map<string, number>();
    values.set(value, (values.get(value) ?? 0) + count);
    groups.set(name, values);
}

function toGroups(groups: Map<string, Map<string, number>>): ShopFacetGroup[] {
    return [...groups.entries()]
        .map(([name, values]) => ({
            name,
            values: [...values.entries()]
                .map(([value, count]) => ({value, count}))
                .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
                .slice(0, 24),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 12);
}

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(shopFacetsFormSchema),
    asyncHandler(async (params: any): Promise<ShopFacetsResponse> => {
        const {languageCode, origin, search, categorySlug, categoryIds, collectionSlug, collectionId} = params;
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
        if (!filter) return {data: emptyFacets()};

        const aggregated: unknown = await Product.aggregate([
            {$match: {...filter, deletedAt: null}},
            {$facet: {
                total: [{$count: "count"}],
                price: [{$group: {_id: null, min: {$min: "$price"}, max: {$max: "$price"}}}],
                brands: [
                    {$match: {brand: {$type: "string", $ne: ""}}},
                    {$group: {_id: "$brand", count: {$sum: 1}}},
                    {$sort: {count: -1, _id: 1}},
                    {$limit: 40},
                ],
                types: [
                    {$group: {_id: "$type", count: {$sum: 1}}},
                    {$sort: {_id: 1}},
                ],
                attributes: [
                    {$unwind: "$attributes"},
                    {$unwind: "$attributes.values"},
                    {$match: {
                        "attributes.name": {$type: "string", $ne: ""},
                        "attributes.values": {$type: "string", $ne: ""},
                    }},
                    {$group: {_id: {name: "$attributes.name", value: "$attributes.values"}, count: {$sum: 1}}},
                ],
                inStock: [{$match: {availableForSale: {$ne: false}}}, {$count: "count"}],
                onSale: [{$match: {$expr: {$gt: ["$compareAtPrice", "$price"]}}}, {$count: "count"}],
                rated: [{$match: {ratingAverage: {$gt: 0}}}, {$count: "count"}],
            }},
        ]).then(rows => rows[0]);

        if (!isRecord(aggregated)) return {data: emptyFacets()};

        const price = readPrice(aggregated.price);
        const groups = new Map<string, Map<string, number>>();
        for (const row of readAttributeRows(aggregated.attributes)) {
            if (row.name.toLowerCase() === BRAND_ATTRIBUTE) continue;
            addOption(groups, row.name, row.value, row.count);
        }

        const attributeQuery: Record<string, unknown> = {isUsedForVariants: true};
        if (companyId != null) attributeQuery.company = companyId;
        const variantAttributes = await ProductAttribute.find(attributeQuery)
            .select("name")
            .noDeleted()
            .lean();
        if (variantAttributes.length > 0) {
            const productIds = await Product.find(filter).noDeleted().distinct("_id");
            const variantQuery: Record<string, unknown> = {
                status: "active",
                product: {$in: productIds},
                "attributeCombination.attribute": {$in: variantAttributes.map(attribute => attribute._id)},
            };
            if (companyId != null) variantQuery.company = companyId;
            const variants = await ProductVariant.find(variantQuery)
                .select("product attributeCombination").noDeleted().lean();

            const nameById = new Map(variantAttributes.map(attribute => [String(attribute._id), attribute.name]));
            const productsByKey = new Map<string, Set<string>>();
            for (const variant of variants) {
                const productId = String(variant.product);
                for (const combo of variant.attributeCombination ?? []) {
                    const name = nameById.get(String(combo.attribute));
                    if (!name || !combo.value) continue;
                    const key = `${name}\u0000${combo.value}`;
                    const products = productsByKey.get(key) ?? new Set<string>();
                    products.add(productId);
                    productsByKey.set(key, products);
                }
            }
            for (const [key, products] of productsByKey) {
                const splitAt = key.indexOf("\u0000");
                addOption(groups, key.slice(0, splitAt), key.slice(splitAt + 1), products.size);
            }
        }

        const types = readBuckets(aggregated.types)
            .filter(option => TYPE_ORDER.has(option.value))
            .sort((a, b) => (TYPE_ORDER.get(a.value) ?? 0) - (TYPE_ORDER.get(b.value) ?? 0));

        return {
            data: {
                total: readCount(aggregated.total),
                priceMin: price.min,
                priceMax: price.max,
                brands: readBuckets(aggregated.brands),
                types,
                attributes: toGroups(groups),
                inStock: readCount(aggregated.inStock),
                onSale: readCount(aggregated.onSale),
                rated: readCount(aggregated.rated),
            },
        };
    }),
);
