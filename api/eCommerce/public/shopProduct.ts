import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {toShopProductDetail, type ShopStockMap} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {shopProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {ShopProductResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopProduct";
export const router = Router();

/**
 * Availability per variant ("" = base product), using the same rule as checkout
 * reservation: a product/variant with no inventory rows is untracked (always
 * available); otherwise it needs on-hand minus reserved > 0 in some warehouse.
 */
async function stockAvailability(productId: unknown, companyId: unknown): Promise<ShopStockMap> {
    const rows = await Inventory.find({product: productId, company: companyId}, {variant: 1, quantityOnHand: 1, quantityReserved: 1}).lean();
    const stock: ShopStockMap = new Map();
    for (const row of rows as any[]) {
        const key = row.variant ? row.variant.toString() : "";
        const available = (row.quantityOnHand ?? 0) - (row.quantityReserved ?? 0) > 0;
        stock.set(key, (stock.get(key) ?? false) || available);
    }
    return stock;
}

const CARD_FIELDS = "title slug type price compareAtPrice mainImage badges featured ratingAverage ratingCount hasVariants";
const RELATED_LIMIT = 8;

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductResponse> => {
        const {languageCode, origin, slug} = params;

        const company = await resolveShopCompany(origin, languageCode);

        const product = await Product.findOne({
            company: company._id,
            slug: String(slug).toLowerCase(),
            status: "active",
            deletedAt: null,
        })
            .populate("categories", "name slug")
            .lean();

        if (!product) {
            throw apiValidationException("product_not_found", null, null, languageCode);
        }

        const variants = (product as any).hasVariants
            ? await ProductVariant.find({product: product._id, company: company._id, status: "active"})
                  .select("sku price compareAtPrice attributeCombination mainImage position")
                  .populate("attributeCombination.attribute", "name")
                  .sort({position: 1})
                  .lean()
            : [];

        // Related: explicit merchandising first, same-category fill after
        const explicitRelatedIds = ((product as any).relatedProducts as any[]) ?? [];
        const relatedFilter: Record<string, unknown> = {
            company: company._id,
            status: "active",
            deletedAt: null,
            _id: {$ne: product._id},
        };

        let related = explicitRelatedIds.length
            ? await Product.find({...relatedFilter, _id: {$in: explicitRelatedIds}}).select(CARD_FIELDS).limit(RELATED_LIMIT).lean()
            : [];

        if (related.length < RELATED_LIMIT) {
            const categoryIds = ((product as any).categories as any[])?.map(c => c._id ?? c) ?? [];
            if (categoryIds.length) {
                const fill = await Product.find({
                    ...relatedFilter,
                    _id: {$nin: [product._id, ...related.map(r => r._id)]},
                    categories: {$in: categoryIds},
                })
                    .select(CARD_FIELDS)
                    .limit(RELATED_LIMIT - related.length)
                    .lean();
                related = [...related, ...fill];
            }
        }

        return {data: toShopProductDetail(product, variants, related, await stockAvailability(product._id, company._id))};
    }),
);
