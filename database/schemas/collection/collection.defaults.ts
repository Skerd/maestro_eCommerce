import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Collection, {type ICollection} from "./collection";
import Product from "@eCommerceModule/database/schemas/product/product";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import {
    defaultProductSeeds,
    type CreateProductsResult,
} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateProductMediaResult} from "@eCommerceModule/database/seeds/catalog/productMedia";

export type CollectionSeed = {
    slug: string;
    name: string;
    description: string;
    /** Resolves product seed keys at seed time. */
    resolveProductKeys: (allKeys: readonly string[]) => readonly string[];
    position: number;
    imageSeedKey?: string;
};

const featuredKeys = defaultProductSeeds.filter((p) => p.featured).map((p) => p.seedKey);
const saleKeys = defaultProductSeeds.filter((p) => p.compareAtPrice != null).map((p) => p.seedKey);
const digitalKeys = defaultProductSeeds.filter((p) => p.type === "digital").map((p) => p.seedKey);
const giftCardKeys = defaultProductSeeds.filter((p) => p.type === "gift_card").map((p) => p.seedKey);
const bundleKeys = defaultProductSeeds.filter((p) => p.type === "bundle").map((p) => p.seedKey);
const newArrivalKeys = defaultProductSeeds.slice(0, 12).map((p) => p.seedKey);

export const defaultCollectionSeeds: readonly CollectionSeed[] = [
    {
        slug: "featured",
        name: demoName("Featured"),
        description: "Hand-picked demo products for the storefront hero.",
        resolveProductKeys: () => (featuredKeys.length ? featuredKeys : newArrivalKeys).slice(0, 12),
        position: 1,
        imageSeedKey: featuredKeys[0] ?? "prod-01-brand-tee",
    },
    {
        slug: "sale",
        name: demoName("On Sale"),
        description: "Products with compare-at pricing for promo demos.",
        resolveProductKeys: () => (saleKeys.length ? saleKeys : featuredKeys).slice(0, 16),
        position: 2,
        imageSeedKey: saleKeys[0] ?? "prod-02-hoodie",
    },
    {
        slug: "new-arrivals",
        name: demoName("New Arrivals"),
        description: "Recently published catalog items.",
        resolveProductKeys: (all) => all.slice(0, 16),
        position: 3,
        imageSeedKey: "prod-phone-03-aura-pro",
    },
    {
        slug: "digital-downloads",
        name: demoName("Digital Downloads"),
        description: "Instant-delivery digital goods.",
        resolveProductKeys: () => (digitalKeys.length ? digitalKeys : ["prod-03-logo-pack"]),
        position: 4,
        imageSeedKey: "prod-03-logo-pack",
    },
    {
        slug: "gift-cards",
        name: demoName("Gift Cards"),
        description: "Store credit denominations for checkout demos.",
        resolveProductKeys: () => (giftCardKeys.length ? giftCardKeys : []),
        position: 5,
        imageSeedKey: "prod-gc-02-50",
    },
    {
        slug: "bundles",
        name: demoName("Bundles"),
        description: "Curated multi-item kits with component stock.",
        resolveProductKeys: () => (bundleKeys.length ? bundleKeys : []),
        position: 6,
        imageSeedKey: "prod-bundle-01-studio-apparel",
    },
];

export type CreateCollectionsResult = {
    bySlug: Record<string, HydratedDocument<ICollection>>;
};

/**
 * Seeds manual merchandising collections. Idempotent on `{company, slug}`.
 */
export async function createCollections(
    parentLogger: serverLogger,
    company: ICompany,
    products: CreateProductsResult,
    media?: CreateProductMediaResult,
): Promise<CreateCollectionsResult> {
    const logger = getLogger("mongoDbInitialization-createCollections", parentLogger);
    logger.start("Creating collections...");

    const allKeys = Object.keys(products.bySeedKey);
    const bySlug: Record<string, HydratedDocument<ICollection>> = {};

    for (const seed of defaultCollectionSeeds) {
        try {
            const productIds: Types.ObjectId[] = [];
            for (const key of seed.resolveProductKeys(allKeys)) {
                const product = products.bySeedKey[key];
                if (!product) {
                    logger.warn(`Skipping product "${key}" on collection "${seed.slug}": product was not seeded.`);
                    continue;
                }
                productIds.push(product._id);
            }

            const mainImage =
                seed.imageSeedKey && media?.bySeedKey[seed.imageSeedKey]
                    ? media.bySeedKey[seed.imageSeedKey].mainImage
                    : undefined;

            const payload = {
                type: "manual" as const,
                name: seed.name,
                slug: seed.slug,
                description: seed.description,
                isVisible: true,
                position: seed.position,
                products: productIds,
                ...(mainImage ? {mainImage} : {}),
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await Collection.findOne({company: company._id, slug: seed.slug});
            if (!doc) {
                doc = await Collection.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            bySlug[seed.slug] = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating collection '${seed.slug}': ${message}`);
        }
    }

    const featured = bySlug.featured;
    const sale = bySlug.sale;
    const digital = bySlug["digital-downloads"];

    for (const [seedKey, product] of Object.entries(products.bySeedKey)) {
        const collectionIds: Types.ObjectId[] = [];
        if (featured && featuredKeys.includes(seedKey)) collectionIds.push(featured._id);
        if (sale && saleKeys.includes(seedKey)) collectionIds.push(sale._id);
        if (digital && digitalKeys.includes(seedKey)) collectionIds.push(digital._id);
        if (bySlug["gift-cards"] && giftCardKeys.includes(seedKey)) collectionIds.push(bySlug["gift-cards"]._id);
        if (bySlug.bundles && bundleKeys.includes(seedKey)) collectionIds.push(bySlug.bundles._id);
        if (collectionIds.length) {
            await Product.updateOne({_id: product._id}, {$set: {collections: collectionIds}});
        }
    }

    logger.finish("Finished creating collections!", Object.keys(bySlug).length);
    return {bySlug};
}
