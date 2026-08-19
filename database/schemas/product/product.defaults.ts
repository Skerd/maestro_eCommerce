import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Product, {type IProduct, type ProductStatus, type ProductType} from "./product";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ECOM_DEMO_TAG} from "@eCommerceModule/database/demo/ecomDemoConstants";
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
    sku: string;
    brand?: string;
    featured?: boolean;
    badges?: string[];
    tags?: string[];
    shortDescription: string;
    description: string;
    trackInventory?: boolean;
    stock?: number;
    reserved?: number;
    hasVariants?: boolean;
};

export const defaultProductSeeds: readonly ProductSeed[] = [
    {
        seedKey: "prod-01-brand-tee",
        title: "Pronix Brand T-Shirt",
        slug: "pronix-brand-tshirt",
        type: "variable",
        status: "active",
        categorySlug: "life-crafts",
        price: 29.9,
        compareAtPrice: 39.9,
        costPrice: 12,
        sku: "PRX-TEE-001",
        brand: "Pronix",
        featured: true,
        badges: ["bestseller", "new"],
        tags: ["apparel", "merch", ECOM_DEMO_TAG],
        shortDescription: "Soft cotton tee with embossed Pronix mark.",
        description: "Premium midweight cotton t-shirt. Demo variable product with size and color options.",
        trackInventory: true,
        hasVariants: true,
    },
    {
        seedKey: "prod-02-hoodie",
        title: "Studio Hoodie",
        slug: "studio-hoodie",
        type: "physical",
        status: "active",
        categorySlug: "life-crafts",
        price: 69,
        compareAtPrice: 89,
        costPrice: 28,
        sku: "PRX-HDY-002",
        brand: "Pronix",
        featured: true,
        badges: ["sale"],
        tags: ["apparel", "merch", ECOM_DEMO_TAG],
        shortDescription: "Heavyweight fleece hoodie for studio days.",
        description: "Brushed interior fleece, ribbed cuffs, kangaroo pocket. Ships from Tirana warehouse.",
        trackInventory: true,
        stock: 42,
        reserved: 3,
    },
    {
        seedKey: "prod-03-logo-pack",
        title: "Logo Source Pack",
        slug: "logo-source-pack",
        type: "digital",
        status: "active",
        categorySlug: "design-logo-branding",
        price: 49,
        sku: "PRX-DIG-003",
        brand: "Pronix Digital",
        featured: true,
        badges: ["digital"],
        tags: ["digital", "branding", ECOM_DEMO_TAG],
        shortDescription: "Downloadable SVG/PNG logo starter kit.",
        description: "Instant digital download: master SVG, PNG exports, and brand usage PDF.",
        trackInventory: false,
    },
    {
        seedKey: "prod-04-ui-kit",
        title: "UI Component Kit",
        slug: "ui-component-kit",
        type: "digital",
        status: "active",
        categorySlug: "design-web-app",
        price: 119,
        compareAtPrice: 149,
        sku: "PRX-DIG-004",
        brand: "Pronix Digital",
        tags: ["digital", "design", ECOM_DEMO_TAG],
        shortDescription: "Figma-ready UI kit for SaaS dashboards.",
        description: "120+ components, dark/light tokens, and example screens. Digital delivery only.",
        trackInventory: false,
    },
    {
        seedKey: "prod-05-camera-strap",
        title: "Leather Camera Strap",
        slug: "leather-camera-strap",
        type: "physical",
        status: "active",
        categorySlug: "photo-product",
        price: 45,
        costPrice: 18,
        sku: "PRX-PHO-005",
        brand: "Pronix Gear",
        badges: ["handmade"],
        tags: ["photography", "accessories", ECOM_DEMO_TAG],
        shortDescription: "Full-grain leather strap with adjustable buckle.",
        description: "Handmade camera strap, 120cm adjustable length, brass hardware.",
        trackInventory: true,
        stock: 18,
        reserved: 1,
    },
    {
        seedKey: "prod-06-light-stand",
        title: "Compact Light Stand",
        slug: "compact-light-stand",
        type: "physical",
        status: "active",
        categorySlug: "photo-product",
        price: 79,
        costPrice: 35,
        sku: "PRX-PHO-006",
        brand: "Pronix Gear",
        tags: ["photography", "studio", ECOM_DEMO_TAG],
        shortDescription: "Portable aluminum light stand up to 2.1m.",
        description: "Folding light stand with air-cushioned column. Low stock demo SKU.",
        trackInventory: true,
        stock: 4,
        reserved: 0,
    },
    {
        seedKey: "prod-07-seo-checklist",
        title: "SEO Launch Checklist",
        slug: "seo-launch-checklist",
        type: "digital",
        status: "active",
        categorySlug: "marketing-seo",
        price: 19,
        sku: "PRX-DIG-007",
        brand: "Pronix Digital",
        tags: ["marketing", "seo", ECOM_DEMO_TAG],
        shortDescription: "Printable SEO go-live checklist (PDF).",
        description: "One-page PDF covering technical SEO, content, and analytics launch steps.",
        trackInventory: false,
    },
    {
        seedKey: "prod-08-gift-card",
        title: "Pronix Gift Card",
        slug: "pronix-gift-card",
        type: "gift_card",
        status: "active",
        categorySlug: "lifestyle",
        price: 50,
        sku: "PRX-GFT-008",
        brand: "Pronix",
        badges: ["gift"],
        tags: ["gift-card", ECOM_DEMO_TAG],
        shortDescription: "€50 store credit gift card.",
        description: "Digital gift card redeemable on Pronix catalog products.",
        trackInventory: false,
    },
    {
        seedKey: "prod-09-notebook",
        title: "Field Notebook",
        slug: "field-notebook",
        type: "physical",
        status: "draft",
        categorySlug: "biz-plans",
        price: 14.5,
        costPrice: 4,
        sku: "PRX-STA-009",
        brand: "Pronix",
        tags: ["stationery", ECOM_DEMO_TAG],
        shortDescription: "A5 dotted notebook — draft listing.",
        description: "Demo draft product for unpublished catalog workflows.",
        trackInventory: true,
        stock: 100,
    },
    {
        seedKey: "prod-10-archive-mug",
        title: "Archive Mug",
        slug: "archive-mug",
        type: "physical",
        status: "archived",
        categorySlug: "life-crafts",
        price: 18,
        sku: "PRX-MER-010",
        brand: "Pronix",
        tags: ["merch", "archived", ECOM_DEMO_TAG],
        shortDescription: "Retired ceramic mug SKU.",
        description: "Archived demo product kept for historical order references.",
        trackInventory: true,
        stock: 0,
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
    const attrSize = attributes.byName["Size"];
    const attrColor = attributes.byName["Color"];

    for (const seed of defaultProductSeeds) {
        try {
            const category = await ProductCategory.findOne({
                slug: seed.categorySlug,
                company: company._id,
            })
                .select("_id")
                .lean();

            const payload: Record<string, unknown> = {
                type: seed.type,
                title: seed.title,
                slug: seed.slug,
                description: seed.description,
                shortDescription: seed.shortDescription,
                sku: seed.sku,
                brand: seed.brand,
                tags: seed.tags ?? [ECOM_DEMO_TAG],
                categories: category ? [category._id] : [],
                price: seed.price,
                compareAtPrice: seed.compareAtPrice,
                costPrice: seed.costPrice,
                currency: currencyId,
                taxable: true,
                requiresShipping: seed.type === "physical" || seed.type === "variable",
                trackInventory: seed.trackInventory ?? false,
                allowBackorder: false,
                lowStockThreshold: 5,
                availableForSale: seed.status === "active",
                featured: seed.featured ?? false,
                badges: seed.badges ?? [],
                status: seed.status,
                publishedAt: seed.status === "active" ? dayjs().subtract(14, "day").toDate() : undefined,
                hasVariants: seed.hasVariants ?? false,
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

    logger.finish("Finished creating products!", Object.keys(bySeedKey).length);
    return {bySeedKey};
}
