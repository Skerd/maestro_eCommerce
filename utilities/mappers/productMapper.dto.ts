import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import type {Product, ProductSimpleRef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import {mapMedia, mapPopulatedSimpleCurrency} from "@coreModule/utilities/mappers/common.mapper";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

function mapNamedSlugRef(ref: any): {_id: string; name: string; slug: string} | undefined {
    if (!ref) return undefined;
    return {
        _id: ref._id?.toString() ?? String(ref),
        name: ref.name ?? "",
        slug: ref.slug ?? "",
    };
}

function mapNamedSlugRefs(refs: unknown): {_id: string; name: string; slug: string}[] {
    if (!Array.isArray(refs)) return [];
    return refs
        .map((r) => mapNamedSlugRef(r))
        .filter((r): r is {_id: string; name: string; slug: string} => r !== undefined);
}

function mapProductRef(ref: any): ProductSimpleRef | undefined {
    if (!ref) return undefined;
    return {
        _id: ref._id?.toString() ?? String(ref),
        title: ref.title ?? "",
        slug: ref.slug ?? "",
    };
}

function mapProductRefs(refs: unknown): ProductSimpleRef[] {
    if (!Array.isArray(refs)) return [];
    return refs.map(mapProductRef).filter((r): r is ProductSimpleRef => r !== undefined);
}

/** Only map media that is actually populated (has file metadata); skip bare ObjectIds. */
function isPopulatedMedia(m: any): boolean {
    return !!m && typeof m === "object" && (m.fileName !== undefined || m.metadata !== undefined);
}

function mapMediaArray(items: unknown): Media[] | undefined {
    if (!Array.isArray(items)) return undefined;
    const mapped = items.filter(isPopulatedMedia).map(mapMedia);
    return mapped.length ? mapped : undefined;
}

function mapAttributeRefs(refs: unknown): {_id: string; name: string}[] {
    if (!Array.isArray(refs)) return [];
    return refs.map((r: any) => ({_id: r?._id?.toString() ?? String(r), name: r?.name ?? ""}));
}

// Local Media type alias (matches common.mapper.mapMedia return shape)
type Media = ReturnType<typeof mapMedia>;

export function productToDTO(product: IProduct): Product {
    const seo = product.seo as Record<string, any> | undefined;
    const variantRef = product.defaultVariant as any;
    return {
        _id: product._id.toString(),
        type: product.type,
        status: product.status,
        title: product.title,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        highlights: product.highlights,
        careInstructions: product.careInstructions,
        warranty: product.warranty,
        faqs: product.faqs,
        // Identifiers
        sku: product.sku,
        barcode: product.barcode,
        gtin: product.gtin,
        upc: product.upc,
        ean: product.ean,
        isbn: product.isbn,
        mpn: product.mpn,
        hsCode: product.hsCode,
        countryOfOrigin: product.countryOfOrigin,
        // Organization
        brand: product.brand,
        vendor: product.vendor,
        tags: product.tags,
        categories: mapNamedSlugRefs(product.categories),
        collections: mapNamedSlugRefs(product.collections),
        // Pricing
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        msrp: product.msrp,
        saleStartsAt: product.saleStartsAt?.toISOString(),
        saleEndsAt: product.saleEndsAt?.toISOString(),
        taxable: product.taxable,
        taxClass: product.taxClass,
        minOrderQty: product.minOrderQty,
        maxOrderQty: product.maxOrderQty,
        stepQty: product.stepQty,
        currency: mapPopulatedSimpleCurrency(product.currency as any),
        // Shipping / physical
        weight: product.weight,
        weightUnit: product.weightUnit,
        dimensions: product.dimensions,
        dimensionUnit: product.dimensionUnit,
        volumetricWeight: product.volumetricWeight,
        shippingClass: product.shippingClass,
        isHazmat: product.isHazmat,
        requiresShipping: product.requiresShipping,
        // Inventory hints
        trackInventory: product.trackInventory,
        allowBackorder: product.allowBackorder,
        lowStockThreshold: product.lowStockThreshold,
        safetyStock: product.safetyStock,
        backorderLimit: product.backorderLimit,
        preorderEnabled: product.preorderEnabled,
        preorderAvailableAt: product.preorderAvailableAt?.toISOString(),
        availableForSale: product.availableForSale,
        // Media
        mainImage: product.mainImage && isPopulatedMedia(product.mainImage) ? mapMedia(product.mainImage) : undefined,
        gallery: mapMediaArray(product.gallery),
        videoUrls: product.videoUrls,
        documents: mapMediaArray(product.documents),
        // Variants / options
        variantOptions: mapAttributeRefs(product.variantOptions),
        hasVariants: product.hasVariants,
        defaultVariant: variantRef
            ? {_id: variantRef._id?.toString() ?? String(variantRef), sku: variantRef.sku}
            : undefined,
        variantCount: product.variantCount,
        // Merchandising
        relatedProducts: mapProductRefs(product.relatedProducts),
        upsells: mapProductRefs(product.upsells),
        crossSells: mapProductRefs(product.crossSells),
        frequentlyBoughtTogether: mapProductRefs(product.frequentlyBoughtTogether),
        featured: product.featured,
        badges: product.badges,
        // Ratings
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
        reviewCount: product.reviewCount,
        // Publishing
        publishedAt: product.publishedAt?.toISOString(),
        // Legacy
        attributes: product.attributes,
        specifications: product.specifications,
        seo: seo
            ? {
                  metaTitle: seo.metaTitle,
                  metaDescription: seo.metaDescription,
                  metaKeywords: seo.metaKeywords,
                  canonicalUrl: seo.canonicalUrl,
                  openGraphTitle: seo.openGraphTitle,
                  openGraphDescription: seo.openGraphDescription,
                  openGraphImage: seo.openGraphImage && isPopulatedMedia(seo.openGraphImage) ? mapMedia(seo.openGraphImage) : undefined,
                  twitterCard: seo.twitterCard,
                  structuredDataType: seo.structuredDataType,
                  sitemapInclude: seo.sitemapInclude,
                  sitemapPriority: seo.sitemapPriority,
                  noIndex: seo.noIndex,
              }
            : undefined,
        company: product.company ? {_id: product.company._id.toString(), name: product.company.name} : undefined,
        ...mapSoftDeleteToDTO(product),
        ...mapOwnershipToDTO(product),
    };
}

export function productsToDTO(products: IProduct[]): Product[] {
    return products.map(productToDTO);
}

export function productToSelect(product: IProduct): ApiSelectDatum {
    return {value: product._id.toString(), label: product.title};
}

export function productsToSelect(products: IProduct[]): ApiSelectDatum[] {
    return products.map(productToSelect);
}
