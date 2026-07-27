import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import type {Product} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import {mapMedia, mapPopulatedRef, mapPopulatedSimpleCurrency} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

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
        categories: product.categories?.map((category) => {
            return {
                _id: category._id,
                name: category.name,
                slug: category.slug,
            }
        }) ?? undefined,
        collections: product.collections?.map((collection) => {
            return {
                _id: collection._id,
                name: collection.name,
                slug: collection.slug,
            }
        }) ?? undefined,
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
        currency: mapPopulatedSimpleCurrency(product.currency),
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
        mainImage: product.mainImage ? mapMedia(product.mainImage) : undefined,
        gallery: !!product.gallery ? product.gallery?.map(mapMedia) : undefined,
        videoUrls: product.videoUrls,
        documents: !!product.documents ? product.documents?.map(mapMedia) : undefined,
        // Variants / options
        variantOptions: product.variantOptions?.map((variant) => mapPopulatedRef(variant)) ?? undefined,
        hasVariants: product.hasVariants,
        defaultVariant: variantRef ? {_id: variantRef._id?.toString(), sku: variantRef.sku} : undefined,
        variantCount: product.variantCount,
        // Merchandising
        relatedProducts: product.relatedProducts?.map((product) => {
            return {
                _id: product._id?.toString(),
                title: product.title,
                slug: product.slug,
            }
        }) ?? undefined,
        upsells: product.upsells?.map((upsell) => {
            return {
                _id: upsell._id?.toString(),
                title: upsell.title,
                slug: upsell.slug,
            }
        }) ?? undefined,
        crossSells: product.crossSells?.map((crossSell) => {
            return {
                _id: crossSell._id?.toString(),
                title: crossSell.title,
                slug: crossSell.slug,
            }
        }) ?? undefined,
        frequentlyBoughtTogether: product.frequentlyBoughtTogether?.map((frequentlyBoughtTogether) => {
            return {
                _id: frequentlyBoughtTogether._id?.toString(),
                title: frequentlyBoughtTogether.title,
                slug: frequentlyBoughtTogether.slug,
            }
        }) ?? undefined,
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
        seo: seo ? {
              metaTitle: seo.metaTitle,
              metaDescription: seo.metaDescription,
              metaKeywords: seo.metaKeywords,
              canonicalUrl: seo.canonicalUrl,
              openGraphTitle: seo.openGraphTitle,
              openGraphDescription: seo.openGraphDescription,
              openGraphImage: !!seo.openGraphImage ? mapMedia(seo.openGraphImage) : undefined,
              twitterCard: seo.twitterCard,
              structuredDataType: seo.structuredDataType,
              sitemapInclude: seo.sitemapInclude,
              sitemapPriority: seo.sitemapPriority,
              noIndex: seo.noIndex,
          } : undefined,
        company: mapCompanyLabel(product.company),
        ...mapSoftDeleteToDTO(product),
        ...mapOwnershipToDTO(product),
        ...mapLifeCycleToDTO(product)
    };
}

export function productsToDTO(products: IProduct[]): Product[] {
    return products.map(productToDTO);
}
