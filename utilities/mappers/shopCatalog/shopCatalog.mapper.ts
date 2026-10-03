import type {
    ShopProductCard,
    ShopProductDetail,
    ShopProductVariant,
} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

function mediaId(value: any): string | undefined {
    if (!value) return undefined;
    return (value._id ?? value).toString();
}

function mediaIds(values: unknown): string[] | undefined {
    if (!Array.isArray(values) || values.length === 0) return undefined;
    return values.map(mediaId).filter((v): v is string => Boolean(v));
}

export function toShopProductCard(product: any): ShopProductCard {
    return {
        _id: product._id.toString(),
        title: product.title ?? "",
        slug: product.slug ?? "",
        type: product.type ?? "physical",
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        mainImage: mediaId(product.mainImage),
        badges: product.badges?.length ? product.badges : undefined,
        featured: product.featured || undefined,
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
        hasVariants: product.hasVariants || undefined,
    };
}

/** Stock availability keyed by variant id ("" = the base product row). */
export type ShopStockMap = Map<string, boolean>;

export function toShopProductVariant(variant: any, stock?: ShopStockMap): ShopProductVariant {
    return {
        _id: variant._id.toString(),
        inStock: stock?.get(variant._id.toString()) ?? true,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        options: Array.isArray(variant.attributeCombination)
            ? variant.attributeCombination.map((c: any) => ({
                  name: c.attribute?.name ?? "",
                  value: c.value ?? "",
              }))
            : undefined,
        mainImage: mediaId(variant.mainImage),
    };
}

export function toShopProductDetail(product: any, variants: any[], related: any[], stock?: ShopStockMap): ShopProductDetail {
    return {
        ...toShopProductCard(product),
        inStock: stock?.get("") ?? true,
        description: product.description,
        gallery: mediaIds(product.gallery),
        videoUrls: product.videoUrls?.length ? product.videoUrls : undefined,
        attributes: product.attributes?.length ? product.attributes : undefined,
        specifications: product.specifications?.length ? product.specifications : undefined,
        minOrderQty: product.minOrderQty,
        maxOrderQty: product.maxOrderQty,
        stepQty: product.stepQty,
        variants: variants.map(variant => toShopProductVariant(variant, stock)),
        related: related.map(toShopProductCard),
        categories: Array.isArray(product.categories)
            ? product.categories
                  .filter((c: any) => c && typeof c === "object" && c.name)
                  .map((c: any) => ({_id: c._id.toString(), name: c.name, slug: c.slug ?? ""}))
            : undefined,
        seo: product.seo ? {metaTitle: product.seo.metaTitle, metaDescription: product.seo.metaDescription} : undefined,
    };
}
