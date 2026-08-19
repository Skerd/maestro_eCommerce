import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Collection, {type ICollection} from "./collection";
import Product from "@eCommerceModule/database/schemas/product/product";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";

export type CollectionSeed = {
    slug: string;
    name: string;
    description: string;
    productKeys: readonly string[];
    position: number;
};

export const defaultCollectionSeeds: readonly CollectionSeed[] = [
    {
        slug: "featured",
        name: "Featured",
        description: "Hand-picked demo products for the storefront hero.",
        productKeys: ["prod-01-brand-tee", "prod-02-hoodie", "prod-03-logo-pack", "prod-04-ui-kit"],
        position: 1,
    },
    {
        slug: "sale",
        name: "On Sale",
        description: "Products with compare-at pricing for promo demos.",
        productKeys: ["prod-02-hoodie", "prod-04-ui-kit", "prod-01-brand-tee"],
        position: 2,
    },
    {
        slug: "new-arrivals",
        name: "New Arrivals",
        description: "Recently published catalog items.",
        productKeys: ["prod-05-camera-strap", "prod-06-light-stand", "prod-08-gift-card"],
        position: 3,
    },
    {
        slug: "digital-downloads",
        name: "Digital Downloads",
        description: "Instant-delivery digital goods.",
        productKeys: ["prod-03-logo-pack", "prod-04-ui-kit", "prod-07-seo-checklist"],
        position: 4,
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
): Promise<CreateCollectionsResult> {
    const logger = getLogger("mongoDbInitialization-createCollections", parentLogger);
    logger.start("Creating collections...");

    const bySlug: Record<string, HydratedDocument<ICollection>> = {};

    for (const seed of defaultCollectionSeeds) {
        try {
            const productIds: Types.ObjectId[] = [];
            for (const key of seed.productKeys) {
                const product = products.bySeedKey[key];
                if (!product) {
                    logger.warn(`Skipping product "${key}" on collection "${seed.slug}": product was not seeded.`);
                    continue;
                }
                productIds.push(product._id);
            }

            const payload = {
                type: "manual" as const,
                name: seed.name,
                slug: seed.slug,
                description: seed.description,
                isVisible: true,
                position: seed.position,
                products: productIds,
                publishedAt: dayjs().subtract(7, "day").toDate(),
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
    const tee = products.bySeedKey["prod-01-brand-tee"];
    const logoPack = products.bySeedKey["prod-03-logo-pack"];

    if (tee && featured && sale) {
        await Product.updateOne(
            {_id: tee._id},
            {$set: {collections: [featured._id, sale._id]}},
        );
    }
    if (logoPack && featured && digital) {
        await Product.updateOne(
            {_id: logoPack._id},
            {$set: {collections: [featured._id, digital._id]}},
        );
    }

    logger.finish("Finished creating collections!", Object.keys(bySlug).length);
    return {bySlug};
}
