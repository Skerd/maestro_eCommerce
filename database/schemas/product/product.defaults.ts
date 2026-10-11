import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Product, {type IProduct, type ProductStatus, type ProductType} from "./product";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import type {CreateProductAttributesResult} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.defaults";

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
};

export const defaultProductSeeds: readonly ProductSeed[] = [
    {
        seedKey: "prod-01-brand-tee",
        title: demoName("Brand T-Shirt"),
        slug: "demo-brand-tshirt",
        type: "variable",
        status: "active",
        categorySlug: "fashion-men",
        price: 29.9,
        compareAtPrice: 39.9,
        costPrice: 12,
        msrp: 44.9,
        sku: "DEMO-TEE-001",
        barcode: "5901234123457",
        gtin: "05901234123457",
        upc: "012345678905",
        ean: "5901234123457",
        mpn: "DEMO-TEE-MW-001",
        hsCode: "610910",
        countryOfOrigin: "AL",
        brand: "Demo",
        vendor: "Demo Apparel",
        featured: true,
        badges: ["bestseller", "new"],
        tags: ["apparel", "merch", "ecom-demo-seed"],
        shortDescription: "Soft cotton tee with embossed demo mark.",
        description:
            "Premium midweight cotton t-shirt. Demo variable product with size and color options. Cut for everyday studio wear with a reinforced collar and side-seamed construction.",
        highlights: ["180gsm cotton", "Size & color variants", "Machine washable"],
        careInstructions: "Machine wash cold, tumble dry low. Do not bleach. Iron on reverse.",
        warranty: "90-day workmanship warranty against manufacturing defects.",
        faqs: [
            {question: "Does it shrink?", answer: "Expect under 3% shrinkage after the first wash."},
            {question: "Are variants stocked separately?", answer: "Yes — each size/color has its own inventory row."},
        ],
        attributes: [
            {name: "Fit", values: ["Regular"]},
            {name: "Neckline", values: ["Crew"]},
        ],
        specifications: [
            {label: "Fabric", value: "100% cotton"},
            {label: "Weight", value: "180 gsm"},
            {label: "Origin", value: "Albania"},
        ],
        seo: {
            metaTitle: "Brand T-Shirt | Demo Merch",
            metaDescription: "Soft cotton tee with size and color variants for catalog demos.",
            metaKeywords: ["t-shirt", "merch", "demo"],
            canonicalUrl: "https://demo.local/products/demo-brand-tshirt",
            openGraphTitle: "Brand T-Shirt",
            openGraphDescription: "Demo variable apparel product with full catalog fields.",
            twitterCard: "summary_large_image",
            structuredDataType: "Product",
            sitemapInclude: true,
            sitemapPriority: 0.8,
            noIndex: false,
        },
        saleStartsAt: dayjs().subtract(7, "day").toDate(),
        saleEndsAt: dayjs().add(21, "day").toDate(),
        taxable: true,
        taxClass: "standard",
        minOrderQty: 1,
        maxOrderQty: 20,
        stepQty: 1,
        weight: 0.22,
        weightUnit: "kg",
        dimensions: {length: 28, width: 20, height: 2},
        dimensionUnit: "cm",
        volumetricWeight: 0.25,
        shippingClass: "apparel",
        isHazmat: false,
        requiresShipping: true,
        trackInventory: true,
        allowBackorder: false,
        lowStockThreshold: 5,
        safetyStock: 3,
        backorderLimit: 0,
        preorderEnabled: false,
        availableForSale: true,
        videoUrls: ["https://demo.local/media/products/demo-brand-tshirt.mp4"],
        hasVariants: true,
        fullyFilled: true,
    },
    {
        seedKey: "prod-02-hoodie",
        title: demoName("Studio Hoodie"),
        slug: "studio-hoodie",
        type: "physical",
        status: "active",
        categorySlug: "fashion-men",
        price: 69,
        compareAtPrice: 89,
        costPrice: 28,
        msrp: 99,
        sku: "DEMO-HDY-002",
        barcode: "5901234123464",
        gtin: "05901234123464",
        upc: "012345678912",
        ean: "5901234123464",
        mpn: "DEMO-HDY-FL-002",
        hsCode: "611020",
        countryOfOrigin: "AL",
        brand: "Demo",
        vendor: "Demo Apparel",
        featured: true,
        badges: ["sale"],
        tags: ["apparel", "merch", "ecom-demo-seed"],
        shortDescription: "Heavyweight fleece hoodie for studio days.",
        description:
            "Brushed interior fleece, ribbed cuffs, kangaroo pocket. Ships from Tirana warehouse. Fully filled demo physical product for catalog and inventory workflows.",
        highlights: ["320gsm fleece", "Kangaroo pocket", "Unisex fit"],
        careInstructions: "Wash inside out at 30°C. Hang dry. Avoid fabric softener.",
        warranty: "6-month fabric warranty excluding normal wear.",
        faqs: [
            {question: "Is sizing true to size?", answer: "Yes — order your usual hoodie size."},
            {question: "Can it be backordered?", answer: "No — when stock hits zero the listing stops selling."},
        ],
        attributes: [
            {name: "Fit", values: ["Relaxed"]},
            {name: "Closure", values: ["Pullover"]},
        ],
        specifications: [
            {label: "Fabric", value: "80% cotton / 20% polyester"},
            {label: "Weight", value: "320 gsm"},
            {label: "Pocket", value: "Kangaroo"},
        ],
        seo: {
            metaTitle: "Studio Hoodie | Demo",
            metaDescription: "Heavyweight fleece hoodie seeded with full product fields for demos.",
            metaKeywords: ["hoodie", "fleece", "studio"],
            canonicalUrl: "https://demo.local/products/studio-hoodie",
            openGraphTitle: "Studio Hoodie",
            openGraphDescription: "Demo physical product with complete catalog data.",
            twitterCard: "summary_large_image",
            structuredDataType: "Product",
            sitemapInclude: true,
            sitemapPriority: 0.7,
            noIndex: false,
        },
        saleStartsAt: dayjs().subtract(3, "day").toDate(),
        saleEndsAt: dayjs().add(14, "day").toDate(),
        taxable: true,
        taxClass: "standard",
        minOrderQty: 1,
        maxOrderQty: 10,
        stepQty: 1,
        weight: 0.65,
        weightUnit: "kg",
        dimensions: {length: 35, width: 28, height: 6},
        dimensionUnit: "cm",
        volumetricWeight: 0.7,
        shippingClass: "apparel",
        isHazmat: false,
        requiresShipping: true,
        trackInventory: true,
        allowBackorder: false,
        lowStockThreshold: 5,
        safetyStock: 4,
        backorderLimit: 0,
        preorderEnabled: false,
        availableForSale: true,
        videoUrls: ["https://demo.local/media/products/studio-hoodie.mp4"],
        stock: 42,
        reserved: 3,
        fullyFilled: true,
    },
    {
        seedKey: "prod-03-logo-pack",
        title: demoName("Logo Source Pack"),
        slug: "logo-source-pack",
        type: "digital",
        status: "active",
        categorySlug: "electronics",
        price: 49,
        sku: "DEMO-DIG-003",
        tags: ["digital", "ecom-demo-seed"],
        shortDescription: "Downloadable SVG/PNG logo starter kit.",
        description: "Minimal digital demo product — only core fields populated.",
        trackInventory: false,
        fullyFilled: false,
    },
];

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

    const tee = bySeedKey["prod-01-brand-tee"];
    const hoodie = bySeedKey["prod-02-hoodie"];
    const logoPack = bySeedKey["prod-03-logo-pack"];
    if (tee && hoodie && logoPack) {
        await Product.updateOne(
            {_id: tee._id},
            {
                $set: {
                    relatedProducts: [hoodie._id],
                    upsells: [hoodie._id],
                    crossSells: [logoPack._id],
                    frequentlyBoughtTogether: [hoodie._id],
                },
            },
        );
        await Product.updateOne(
            {_id: hoodie._id},
            {
                $set: {
                    relatedProducts: [tee._id],
                    upsells: [tee._id],
                    crossSells: [logoPack._id],
                    frequentlyBoughtTogether: [tee._id],
                },
            },
        );
    }

    logger.finish("Finished creating products!", Object.keys(bySeedKey).length);
    return {bySeedKey};
}
