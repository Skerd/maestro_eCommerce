import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import {isStockTracked} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {resolveStorefrontContext, inStorefrontCatalog} from "@coreModule/utilities/marketing/portalStorefront";
import {toShopProductDetail, type ShopStockMap} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {PORTAL_CURRENCY_SELECT, toPortalSeller} from "@coreModule/utilities/mappers/portal/portalStorefrontMapper.dto";
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
    const warehouseIds = (await warehouseService.find({company: companyId, isActive: true}, {withDeleted: false}, undefined, "_id"))
        .map(warehouse => warehouse._id);
    const rows = await inventoryService.find(
        {product: product._id, company: companyId, warehouse: {$in: warehouseIds}},
        {withDeleted: false},
        undefined,
        "variant quantityOnHand quantityReserved",
    );

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

const CARD_FIELDS = "title slug type price compareAtPrice mainImage badges featured ratingAverage ratingCount hasVariants company currency";
const RELATED_LIMIT = 8;

const DETAIL_POPULATE = [
    {path: "categories", select: "name slug"},
    {path: "company", select: "name logo siteSlug siteHost"},
    {path: "currency", select: PORTAL_CURRENCY_SELECT},
] as const;

async function findActiveProduct(filter: Record<string, unknown>) {
    return productService.findOne({...filter, status: "active"}, {withDeleted: false}, [...DETAIL_POPULATE]);
}

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductResponse> => {
        const {languageCode, origin, id, slug, sellerCompanyId} = params;

        const ctx = await resolveStorefrontContext(origin, languageCode);
        return inStorefrontCatalog(ctx, async () => {
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
                    const matches = await productService.find({slug: slugKey, status: "active"}, {withDeleted: false}, [...DETAIL_POPULATE]);
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
            if (ctx.mode === "platform" && !toPortalSeller(product.company)) {
                throw apiValidationException("product_not_found", null, null, languageCode);
            }

            const variants = product.hasVariants
                ? await productVariantService.find(
                      {product: product._id, company: productSellerId, status: "active"},
                      {},
                      {path: "attributeCombination.attribute", select: "name"},
                      "sku price compareAtPrice attributeCombination mainImage order trackInventory",
                      {order: 1},
                  )
                : [];

            const relatedFilter: Record<string, unknown> = {
                company: productSellerId,
                status: "active",
                _id: {$ne: product._id},
            };

            const explicitRelatedIds = (product.relatedProducts as any[]) ?? [];
            let related = explicitRelatedIds.length
                ? await productService.find({...relatedFilter, _id: {$in: explicitRelatedIds}}, {withDeleted: false}, [{path: "company", select: "name logo siteSlug siteHost"}, {path: "currency", select: PORTAL_CURRENCY_SELECT}], CARD_FIELDS, undefined, RELATED_LIMIT)
                : [];

            if (related.length < RELATED_LIMIT) {
                const categoryIds = (product.categories as any[])?.map((c: any) => c._id ?? c) ?? [];
                if (categoryIds.length) {
                    const fill = await productService.find({
                        ...relatedFilter,
                        _id: {$nin: [product._id, ...related.map((r: any) => r._id)]},
                        categories: {$in: categoryIds},
                    }, {withDeleted: false}, [{path: "company", select: "name logo siteSlug siteHost"}, {path: "currency", select: PORTAL_CURRENCY_SELECT}], CARD_FIELDS, undefined, RELATED_LIMIT - related.length);
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

        });
    }),
);
