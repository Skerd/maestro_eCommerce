import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import type {Product} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import type {CollectionSimple} from "armonia/src/modules/eCommerce/dto/collection.dto";
import type {ProductAttributeSimple} from "armonia/src/modules/eCommerce/dto/productAttribute.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import type {InventorySimple} from "armonia/src/modules/eCommerce/dto/inventory.dto";
import type {ProductReviewSimple} from "armonia/src/modules/eCommerce/dto/productReview.dto";
import {mapMedia, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {CollectionSimpleSnippet} from "@eCommerceModule/database/schemas/collection/collection.snippets";
import {ProductAttributeSimpleSnippet} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {InventorySimpleSnippet} from "@eCommerceModule/database/schemas/inventory/inventory.snippets";
import {ProductReviewSimpleSnippet} from "@eCommerceModule/database/schemas/productReview/productReview.snippets";
import {mapLifeCycleToDTO, mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function productToDTO(product: IProduct): Product {
    const seo = product.seo;
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
        sku: product.sku,
        barcode: product.barcode,
        gtin: product.gtin,
        upc: product.upc,
        ean: product.ean,
        isbn: product.isbn,
        mpn: product.mpn,
        hsCode: product.hsCode,
        countryOfOrigin: product.countryOfOrigin,
        brand: product.brand,
        vendor: product.vendor,
        tags: product.tags,
        categories: product.categories?.map((category) => mapSnippet<CategorySimple>()(category, CategorySimpleSnippet)).filter((c): c is CategorySimple => !!c),
        collections: product.collections?.map((collection) => mapSnippet<CollectionSimple>()(collection, CollectionSimpleSnippet)).filter((c): c is CollectionSimple => !!c),
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
        currency: mapSnippet<CurrencySimple>()(product.currency, CurrencySimpleSnippet),
        weight: product.weight,
        weightUnit: product.weightUnit,
        dimensions: product.dimensions,
        dimensionUnit: product.dimensionUnit,
        volumetricWeight: product.volumetricWeight,
        shippingClass: product.shippingClass,
        isHazmat: product.isHazmat,
        requiresShipping: product.requiresShipping,
        trackInventory: product.trackInventory,
        allowBackorder: product.allowBackorder,
        lowStockThreshold: product.lowStockThreshold,
        safetyStock: product.safetyStock,
        backorderLimit: product.backorderLimit,
        preorderEnabled: product.preorderEnabled,
        preorderAvailableAt: product.preorderAvailableAt?.toISOString(),
        availableForSale: product.availableForSale,
        mainImage: product.mainImage ? mapMedia(product.mainImage) : undefined,
        gallery: product.gallery ? product.gallery.map(mapMedia) : undefined,
        videoUrls: product.videoUrls,
        documents: product.documents ? product.documents.map(mapMedia) : undefined,
        variantOptions: product.variantOptions?.map((variant) => mapSnippet<ProductAttributeSimple>()(variant, ProductAttributeSimpleSnippet)).filter((v): v is ProductAttributeSimple => !!v),
        hasVariants: product.hasVariants,
        defaultVariant: mapSnippet<ProductVariantSimple>()(product.defaultVariant, ProductVariantSimpleSnippet),
        variants: product.variants
            ?.map((variant) => mapSnippet<ProductVariantSimple>()(variant, ProductVariantSimpleSnippet))
            .filter((variant): variant is ProductVariantSimple => !!variant) ?? [],
        inventories: product.inventories
            ?.map((inventory) => mapSnippet<InventorySimple>()(inventory, InventorySimpleSnippet))
            .filter((inventory): inventory is InventorySimple => !!inventory) ?? [],
        reviews: product.reviews
            ?.map((review) => mapSnippet<ProductReviewSimple>()(review, ProductReviewSimpleSnippet))
            .filter((review): review is ProductReviewSimple => !!review) ?? [],
        variantCount: product.variantCount,
        relatedProducts: product.relatedProducts?.map((related) => mapSnippet<ProductSimple>()(related, ProductSimpleSnippet)).filter((p): p is ProductSimple => !!p),
        upsells: product.upsells?.map((upsell) => mapSnippet<ProductSimple>()(upsell, ProductSimpleSnippet)).filter((p): p is ProductSimple => !!p),
        crossSells: product.crossSells?.map((crossSell) => mapSnippet<ProductSimple>()(crossSell, ProductSimpleSnippet)).filter((p): p is ProductSimple => !!p),
        frequentlyBoughtTogether: product.frequentlyBoughtTogether?.map((item) => mapSnippet<ProductSimple>()(item, ProductSimpleSnippet)).filter((p): p is ProductSimple => !!p),
        featured: product.featured,
        badges: product.badges,
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
        reviewCount: product.reviewCount,
        publishedAt: product.publishedAt?.toISOString(),
        attributes: product.attributes,
        specifications: product.specifications,
        seo: seo ? {
            metaTitle: seo.metaTitle,
            metaDescription: seo.metaDescription,
            metaKeywords: seo.metaKeywords,
            canonicalUrl: seo.canonicalUrl,
            openGraphTitle: seo.openGraphTitle,
            openGraphDescription: seo.openGraphDescription,
            openGraphImage: seo.openGraphImage ? mapMedia(seo.openGraphImage) : undefined,
            twitterCard: seo.twitterCard,
            structuredDataType: seo.structuredDataType,
            sitemapInclude: seo.sitemapInclude,
            sitemapPriority: seo.sitemapPriority,
            noIndex: seo.noIndex,
        } : undefined,
        ...mapSoftDeleteToDTO(product),
        ...mapOwnershipToDTO(product),
        ...mapLifeCycleToDTO(product),
    };
}

export function productsToDTO(products: IProduct[]): Product[] {
    return products.map(productToDTO);
}
