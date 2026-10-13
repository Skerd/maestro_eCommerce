import {createHash} from "crypto";
import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import {ObjectId} from "mongodb";
import Product, {type IProduct, type ProductStatus, type ProductType} from "./product";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import type {CreateProductAttributesResult} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.defaults";
import {
    catalogProductSeeds,
    type CatalogProductSeed,
} from "@eCommerceModule/database/schemas/product/product.catalog.seeds";
import {resolveProductVideoUrls} from "@eCommerceModule/database/schemas/product/product.catalog.media";
import type {CreateProductMediaResult} from "@eCommerceModule/database/seeds/catalog/productMedia";

export type ProductSeed = {
    seedKey: string;
    title: string;
    slug: string;
    type: ProductType;
    status: ProductStatus;
    categorySlug: string;
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    msrp?: number;
    sku: string;
    barcode?: string;
    gtin?: string;
    upc?: string;
    ean?: string;
    mpn?: string;
    hsCode?: string;
    countryOfOrigin?: string;
    brand?: string;
    vendor?: string;
    featured?: boolean;
    badges?: string[];
    tags?: string[];
    shortDescription?: string;
    description?: string;
    highlights?: string[];
    careInstructions?: string;
    warranty?: string;
    faqs?: {question: string; answer: string}[];
    attributes?: {name: string; values?: string[]}[];
    specifications?: {label: string; value: string}[];
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        metaKeywords?: string[];
        canonicalUrl?: string;
        openGraphTitle?: string;
        openGraphDescription?: string;
        twitterCard?: "summary" | "summary_large_image";
        structuredDataType?: string;
        sitemapInclude?: boolean;
        sitemapPriority?: number;
        noIndex?: boolean;
    };
    saleStartsAt?: Date;
    saleEndsAt?: Date;
    taxable?: boolean;
    taxClass?: string;
    minOrderQty?: number;
    maxOrderQty?: number;
    stepQty?: number;
    weight?: number;
    weightUnit?: "kg" | "lb" | "g" | "oz";
    dimensions?: {length?: number; width?: number; height?: number};
    dimensionUnit?: "cm" | "in";
    volumetricWeight?: number;
    shippingClass?: string;
    isHazmat?: boolean;
    requiresShipping?: boolean;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    lowStockThreshold?: number;
    safetyStock?: number;
    backorderLimit?: number;
    preorderEnabled?: boolean;
    preorderAvailableAt?: Date;
    availableForSale?: boolean;
    videoUrls?: string[];
    downloadLimit?: number;
    downloadExpiryDays?: number;
    stock?: number;
    reserved?: number;
    hasVariants?: boolean;
    /** When false, only core catalog fields are written (minimal demo product). */
    fullyFilled?: boolean;
    bundleComponents?: readonly {productKey: string; quantity: number}[];
};

/**
 * Deterministic unique 12-digit barcode per seed key.
 * SKU numeric suffixes alone collide across categories (…-003, …-003).
 */
function uniqueProductBarcode(seedKey: string): string {
    const digest = createHash("sha256").update(`ecom-barcode:${seedKey}`).digest();
    let digits = "";
    for (let i = 0; i < digest.length && digits.length < 12; i++) {
        digits += String(digest[i] % 10);
    }
    return digits.padStart(12, "0").slice(0, 12);
}

function expandCatalogSeed(seed: CatalogProductSeed): ProductSeed {
    const type = seed.type ?? "physical";
    const isDigital = type === "digital";
    const isGiftCard = type === "gift_card";
    const isBundle = type === "bundle";
    const ships = type === "physical" || type === "variable" || isBundle;
    const tracksStock = seed.trackInventory ?? (type === "physical" || type === "variable");
    const fullyFilled = seed.fullyFilled !== false;
    const brand = seed.brand ?? "Demo";
    const vendor = seed.vendor ?? "Demo Vendor";
    const barcode = uniqueProductBarcode(seed.seedKey);
    const description =
        seed.description ??
        `${seed.shortDescription} Fully populated demo catalog item for storefront and operations workflows.`;

    if (!fullyFilled) {
        return {
            seedKey: seed.seedKey,
            title: demoName(seed.title),
            slug: seed.slug,
            type,
            status: "active",
            categorySlug: seed.categorySlug,
            price: seed.price,
            sku: seed.sku,
            tags: seed.tags ?? ["ecom-demo-seed"],
            shortDescription: seed.shortDescription,
            description,
            trackInventory: tracksStock,
            fullyFilled: false,
            bundleComponents: seed.bundleComponents,
        };
    }

    const compareAt = seed.compareAtPrice;
    const cost =
        seed.costPrice ??
        (isGiftCard ? 0 : Math.round(seed.price * 0.4 * 100) / 100);
    const msrp = compareAt ? Math.round(compareAt * 1.1 * 100) / 100 : Math.round(seed.price * 1.15 * 100) / 100;

    const fulfillmentHint = isGiftCard
        ? "Issued as store credit after payment"
        : isBundle
          ? "Ships as component SKUs; stock reserved per line"
          : isDigital
            ? "Instant digital delivery"
            : "Tracked warehouse stock";

    return {
        seedKey: seed.seedKey,
        title: demoName(seed.title),
        slug: seed.slug,
        type,
        status: "active",
        categorySlug: seed.categorySlug,
        price: seed.price,
        compareAtPrice: compareAt,
        costPrice: cost,
        msrp,
        sku: seed.sku,
        barcode,
        gtin: `0${barcode}`,
        upc: barcode.slice(0, 12),
        ean: barcode,
        mpn: `${seed.sku}-MW`,
        hsCode: seed.hsCode,
        countryOfOrigin: "EU",
        brand,
        vendor,
        featured: seed.featured ?? false,
        badges: seed.badges ?? [],
        tags: seed.tags ?? ["ecom-demo-seed", seed.categorySlug],
        shortDescription: seed.shortDescription,
        description,
        highlights: ["Demo-ready catalog fields", fulfillmentHint, `${brand} collection`],
        careInstructions: isGiftCard
            ? "Delivered by email after payment. Treat the code like cash."
            : isDigital
              ? "Download from your account after purchase. Keep your access token private."
              : isBundle
                ? "Bundle components ship together when all lines are in stock."
                : "Follow care label. Store in a dry place away from direct heat.",
        warranty: isGiftCard
            ? "Unused balance refundable within 14 days of purchase (demo policy)."
            : isDigital
              ? "30-day re-download guarantee for corrupted files."
              : "90-day workmanship warranty against manufacturing defects.",
        faqs: [
            {
                question: "Is this a demo product?",
                answer: "Yes — seeded for storefront and panel demos with full catalog fields.",
            },
            {
                question: isGiftCard
                    ? "How do I redeem it?"
                    : isBundle
                      ? "What is included?"
                      : isDigital
                        ? "How do I download?"
                        : "When will it ship?",
                answer: isGiftCard
                    ? "Apply the issued gift-card code at checkout. Balance covers eligible order totals."
                    : isBundle
                      ? "See the bundle components on the product sheet — each line reserves its own stock."
                      : isDigital
                        ? "A download link is issued after payment clears."
                        : "Orders placed before 14:00 typically leave the primary warehouse the next business day.",
            },
        ],
        attributes: isGiftCard
            ? [{name: "Format", values: ["Gift card"]}]
            : isBundle
              ? [{name: "Format", values: ["Bundle"]}]
              : isDigital
                ? [{name: "Format", values: ["Digital download"]}]
                : [
                      {name: "Brand", values: [brand]},
                      {name: "Line", values: ["Demo"]},
                  ],
        specifications: [
            {label: "SKU", value: seed.sku},
            {label: "Brand", value: brand},
            {label: "Type", value: type},
            ...(seed.hsCode ? [{label: "HS Code", value: seed.hsCode}] : []),
            {label: "Origin", value: "EU"},
        ],
        seo: {
            metaTitle: `${seed.title} | Demo Shop`,
            metaDescription: seed.shortDescription,
            metaKeywords: [seed.title.toLowerCase(), brand.toLowerCase(), type, "demo"],
            canonicalUrl: `https://demo.local/products/${seed.slug}`,
            openGraphTitle: seed.title,
            openGraphDescription: seed.shortDescription,
            twitterCard: "summary_large_image",
            structuredDataType: "Product",
            sitemapInclude: true,
            sitemapPriority: seed.featured ? 0.9 : 0.7,
            noIndex: false,
        },
        saleStartsAt: compareAt ? dayjs().subtract(5, "day").toDate() : undefined,
        saleEndsAt: compareAt ? dayjs().add(25, "day").toDate() : undefined,
        taxable: !isGiftCard,
        taxClass: isGiftCard ? undefined : "standard",
        minOrderQty: 1,
        maxOrderQty: isGiftCard || isDigital ? 5 : 20,
        stepQty: 1,
        weight: ships ? (seed.weight ?? 0.5) : undefined,
        weightUnit: ships ? "kg" : undefined,
        dimensions: ships ? {length: 28, width: 20, height: 8} : undefined,
        dimensionUnit: ships ? "cm" : undefined,
        volumetricWeight: ships ? (seed.weight ?? 0.5) * 1.1 : undefined,
        shippingClass: ships
            ? seed.categorySlug.startsWith("fashion")
                ? "apparel"
                : "standard"
            : undefined,
        isHazmat: false,
        requiresShipping: ships,
        trackInventory: tracksStock,
        allowBackorder: false,
        lowStockThreshold: 5,
        safetyStock: 3,
        backorderLimit: 0,
        preorderEnabled: false,
        availableForSale: true,
        videoUrls: resolveProductVideoUrls(seed),
        downloadLimit: isDigital ? 5 : undefined,
        downloadExpiryDays: isDigital ? 30 : undefined,
        stock: seed.stock,
        reserved: seed.reserved,
        hasVariants: seed.hasVariants ?? false,
        fullyFilled: true,
        bundleComponents: seed.bundleComponents,
    };
}

export const defaultProductSeeds: readonly ProductSeed[] = catalogProductSeeds.map(expandCatalogSeed);

export type CreateProductsResult = {
    bySeedKey: Record<string, HydratedDocument<IProduct>>;
};

/**
 * Seeds the catalog products. Idempotent on `{company, slug}`.
 * Missing product-category slugs leave `categories` empty (same as the inlined seeder).
 */
export async function createProducts(
    parentLogger: serverLogger,
    company: ICompany,
    currencyId: Types.ObjectId,
    attributes: CreateProductAttributesResult,
    media?: CreateProductMediaResult,
): Promise<CreateProductsResult> {
    const logger = getLogger("mongoDbInitialization-createProducts", parentLogger);
    logger.start("Creating products...");

    const bySeedKey: Record<string, HydratedDocument<IProduct>> = {};
    const attrSize = attributes.bySeedKey["attr-size"];
    const attrColor = attributes.bySeedKey["attr-color"];

    for (const seed of defaultProductSeeds) {
        try {
            const category = await ProductCategory.findOne({
                slug: seed.categorySlug,
                company: company._id,
            })
                .select("_id")
                .lean();

            const mediaBundle = media?.bySeedKey[seed.seedKey];

            const payload: Record<string, unknown> = seed.fullyFilled
                ? {
                      type: seed.type,
                      title: seed.title,
                      slug: seed.slug,
                      description: seed.description,
                      shortDescription: seed.shortDescription,
                      highlights: seed.highlights,
                      careInstructions: seed.careInstructions,
                      warranty: seed.warranty,
                      faqs: seed.faqs,
                      attributes: seed.attributes,
                      specifications: seed.specifications,
                      seo: seed.seo,
                      sku: seed.sku,
                      barcode: seed.barcode,
                      gtin: seed.gtin,
                      upc: seed.upc,
                      ean: seed.ean,
                      mpn: seed.mpn,
                      hsCode: seed.hsCode,
                      countryOfOrigin: seed.countryOfOrigin,
                      brand: seed.brand,
                      vendor: seed.vendor,
                      tags: seed.tags ?? ["ecom-demo-seed"],
                      categories: category ? [category._id] : [],
                      price: seed.price,
                      compareAtPrice: seed.compareAtPrice,
                      costPrice: seed.costPrice,
                      msrp: seed.msrp,
                      saleStartsAt: seed.saleStartsAt,
                      saleEndsAt: seed.saleEndsAt,
                      currency: currencyId,
                      taxable: seed.taxable ?? true,
                      taxClass: seed.taxClass,
                      minOrderQty: seed.minOrderQty,
                      maxOrderQty: seed.maxOrderQty,
                      stepQty: seed.stepQty,
                      weight: seed.weight,
                      weightUnit: seed.weightUnit,
                      dimensions: seed.dimensions,
                      dimensionUnit: seed.dimensionUnit,
                      volumetricWeight: seed.volumetricWeight,
                      shippingClass: seed.shippingClass,
                      isHazmat: seed.isHazmat ?? false,
                      requiresShipping: seed.requiresShipping ?? (seed.type === "physical" || seed.type === "variable"),
                      trackInventory: seed.trackInventory ?? false,
                      allowBackorder: seed.allowBackorder ?? false,
                      lowStockThreshold: seed.lowStockThreshold ?? 5,
                      safetyStock: seed.safetyStock,
                      backorderLimit: seed.backorderLimit,
                      preorderEnabled: seed.preorderEnabled ?? false,
                      preorderAvailableAt: seed.preorderAvailableAt,
                      availableForSale: seed.availableForSale ?? seed.status === "active",
                      videoUrls: seed.videoUrls ?? [],
                      downloadLimit: seed.downloadLimit,
                      downloadExpiryDays: seed.downloadExpiryDays,
                      featured: seed.featured ?? false,
                      badges: seed.badges ?? [],
                      status: seed.status,
                      publishedAt: seed.status === "active" ? dayjs().subtract(14, "day").toDate() : undefined,
                      hasVariants: seed.hasVariants ?? false,
                      ...(mediaBundle
                          ? {
                                mainImage: mediaBundle.mainImage,
                                gallery: mediaBundle.gallery as ObjectId[],
                            }
                          : {}),
                      company: company._id,
                      createdBy: company.createdBy,
                  }
                : {
                      type: seed.type,
                      title: seed.title,
                      slug: seed.slug,
                      description: seed.description,
                      shortDescription: seed.shortDescription,
                      sku: seed.sku,
                      tags: seed.tags ?? ["ecom-demo-seed"],
                      categories: category ? [category._id] : [],
                      price: seed.price,
                      currency: currencyId,
                      taxable: true,
                      requiresShipping: false,
                      trackInventory: seed.trackInventory ?? false,
                      allowBackorder: false,
                      availableForSale: seed.status === "active",
                      featured: false,
                      badges: [],
                      status: seed.status,
                      publishedAt: seed.status === "active" ? dayjs().subtract(14, "day").toDate() : undefined,
                      hasVariants: false,
                      ...(mediaBundle
                          ? {
                                mainImage: mediaBundle.mainImage,
                                gallery: mediaBundle.gallery as ObjectId[],
                            }
                          : {}),
                      company: company._id,
                      createdBy: company.createdBy,
                  };

            if (seed.hasVariants) {
                if (!attrSize || !attrColor) {
                    logger.warn(
                        `Skipping variantOptions on "${seed.seedKey}": Size/Color attributes were not seeded.`,
                    );
                } else {
                    payload.variantOptions = [attrSize._id, attrColor._id];
                }
            }

            let doc = await Product.findOne({company: company._id, slug: seed.slug});
            if (!doc) {
                doc = await Product.create(payload);
                logger.debug(`Created product ${seed.slug}`);
            } else {
                doc.set(payload);
                await doc.save();
            }
            bySeedKey[seed.seedKey] = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating product '${seed.seedKey}': ${message}`);
        }
    }

    for (const seed of catalogProductSeeds) {
        if (seed.type !== "bundle" || !seed.bundleComponents?.length) continue;
        const bundle = bySeedKey[seed.seedKey];
        if (!bundle) {
            logger.warn(`Skipping bundle components for "${seed.seedKey}": bundle product was not seeded.`);
            continue;
        }
        const components: {product: Types.ObjectId; quantity: number}[] = [];
        let missing = false;
        for (const line of seed.bundleComponents) {
            const component = bySeedKey[line.productKey];
            if (!component) {
                logger.warn(
                    `Skipping bundle "${seed.seedKey}": component "${line.productKey}" was not seeded.`,
                );
                missing = true;
                break;
            }
            if (component.type === "bundle") {
                logger.warn(
                    `Skipping bundle "${seed.seedKey}": component "${line.productKey}" is itself a bundle.`,
                );
                missing = true;
                break;
            }
            components.push({product: component._id, quantity: line.quantity});
        }
        if (missing || components.length === 0) continue;
        await Product.updateOne({_id: bundle._id}, {$set: {bundleComponents: components}});
        bundle.set("bundleComponents", components);
    }

    const byCategory = new Map<string, HydratedDocument<IProduct>[]>();
    for (const seed of defaultProductSeeds) {
        const doc = bySeedKey[seed.seedKey];
        if (!doc) continue;
        const list = byCategory.get(seed.categorySlug) ?? [];
        list.push(doc);
        byCategory.set(seed.categorySlug, list);
    }

    for (const [, products] of byCategory) {
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const related = products.filter((_, idx) => idx !== i).slice(0, 3).map((p) => p._id);
            const upsell = products[(i + 1) % products.length]?._id;
            const cross = products[(i + 2) % products.length]?._id;
            await Product.updateOne(
                {_id: product._id},
                {
                    $set: {
                        relatedProducts: related,
                        upsells: upsell ? [upsell] : [],
                        crossSells: cross ? [cross] : [],
                        frequentlyBoughtTogether: upsell ? [upsell] : [],
                    },
                },
            );
        }
    }

    logger.finish("Finished creating products!", Object.keys(bySeedKey).length);
    return {bySeedKey};
}
