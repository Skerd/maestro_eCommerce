import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {isStockTracked} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {toShopProductDetail, toShopSeller, type ShopStockMap} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {shopProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {ShopProductResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopProduct";
export const router = Router();

/**
 * Availability per variant ("" = base product), using the same rules as checkout
 * reservation: untracked items are always available (isStockTracked); tracked
 * ones need on-hand minus reserved > 0 in some active warehouse. A product with
 * variants is available when any of its variants is.
 */
async function stockAvailability(product: any, variants: any[], companyId: unknown): Promise<ShopStockMap> {
    const warehouseIds = (await Warehouse.find({company: companyId, isActive: true}, {_id: 1}).noDeleted().lean())
        .map(warehouse => warehouse._id);
    const rows = await Inventory.find(
        {product: product._id, company: companyId, warehouse: {$in: warehouseIds}},
        {variant: 1, quantityOnHand: 1, quantityReserved: 1},
    ).noDeleted().lean();

    const available = new Set<string>();
    for (const row of rows as any[]) {
        if ((row.quantityOnHand ?? 0) - (row.quantityReserved ?? 0) > 0) {
            available.add(row.variant ? row.variant.toString() : "");
        }
    }

    const stock: ShopStockMap = new Map();
    for (const variant of variants) {
        const key = variant._id.toString();
        stock.set(key, !isStockTracked(product, variant) || available.has(key));
    }
    stock.set("", variants.length
        ? [...stock.values()].some(Boolean)
        : !isStockTracked(product) || available.has(""));
    return stock;
}

const CARD_FIELDS = "title slug type price compareAtPrice mainImage badges featured ratingAverage ratingCount hasVariants company";
const RELATED_LIMIT = 8;

const DETAIL_POPULATE = [
    {path: "categories", select: "name slug"},
    {path: "company", select: "name logo shopSlug shopHost"},
] as const;

async function findActiveProduct(filter: Record<string, unknown>) {
    return Product.findOne({...filter, status: "active"}).noDeleted()
        .populate([...DETAIL_POPULATE])
        .lean();
}

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductResponse> => {
        const {languageCode, origin, id, slug, sellerCompanyId} = params;

        const ctx = await resolveShopContext(origin, languageCode);

        let product: any;
        if (id) {
            const byId: Record<string, unknown> = {_id: new ObjectId(id)};
            if (ctx.mode === "tenant") byId.company = ctx.company._id;
            product = await findActiveProduct(byId);
        } else if (slug) {
            const slugKey = String(slug).toLowerCase();
            if (ctx.mode === "tenant") {
                product = await findActiveProduct({company: ctx.company._id, slug: slugKey});
            } else if (sellerCompanyId) {
                product = await findActiveProduct({company: new ObjectId(sellerCompanyId), slug: slugKey});
            } else {
                const matches = await Product.find({slug: slugKey, status: "active"}).noDeleted()
                    .populate([...DETAIL_POPULATE])
                    .lean();
                // Ambiguous slug across sellers — require id or sellerCompanyId
                if (matches.length > 1) {
                    throw apiValidationException("product_not_found", null, null, languageCode);
                }
                product = matches[0];
            }
        }

        if (!product) {
            throw apiValidationException("product_not_found", null, null, languageCode);
        }

        const productSellerId = product.company?._id ?? product.company;
        // Orphan rows (company missing after populate) must not surface on the platform apex.
        if (ctx.mode === "platform" && !toShopSeller(product.company)) {
            throw apiValidationException("product_not_found", null, null, languageCode);
        }

        const variants = product.hasVariants
            ? await ProductVariant.find({product: product._id, company: productSellerId, status: "active"})
                  .select("sku price compareAtPrice attributeCombination mainImage order trackInventory")
                  .populate("attributeCombination.attribute", "name")
                  .sort({order: 1})
                  .lean()
            : [];

        const relatedFilter: Record<string, unknown> = {
            company: productSellerId,
            status: "active",
            _id: {$ne: product._id},
        };

        const explicitRelatedIds = (product.relatedProducts as any[]) ?? [];
        let related = explicitRelatedIds.length
            ? await Product.find({...relatedFilter, _id: {$in: explicitRelatedIds}}).noDeleted()
                .select(CARD_FIELDS)
                .populate("company", "name logo shopSlug shopHost")
                .limit(RELATED_LIMIT)
                .lean()
            : [];

        if (related.length < RELATED_LIMIT) {
            const categoryIds = (product.categories as any[])?.map((c: any) => c._id ?? c) ?? [];
            if (categoryIds.length) {
                const fill = await Product.find({
                    ...relatedFilter,
                    _id: {$nin: [product._id, ...related.map((r: any) => r._id)]},
                    categories: {$in: categoryIds},
                }).noDeleted()
                    .select(CARD_FIELDS)
                    .populate("company", "name logo shopSlug shopHost")
                    .limit(RELATED_LIMIT - related.length)
                    .lean();
                related = [...related, ...fill];
            }
        }

        return {
            data: toShopProductDetail(
                product,
                variants,
                related,
                await stockAvailability(product, variants, productSellerId),
            ),
        };
    }),
);
