import ProductCategory, { type IProductCategory } from "./category";
import { getLogger, serverLogger } from "@coreModule/loggers/serverLog";
import { ICompany } from "@coreModule/database/schemas/company/company";
import type { HydratedDocument } from "mongoose";
import {demoName} from "@coreModule/utilities/helpers";

export type CategorySeed = {
    name: string;
    slug: string;
    order: number;
    parentSlug?: string;
};

/** Product-commerce taxonomy of the demo fashion shop. Independent of marketplace ListingCategory. */
const defaultCategorySeeds: readonly CategorySeed[] = [
    { name: demoName("Women"), slug: "women", order: 1 },
    { name: demoName("Men"), slug: "men", order: 2 },
    { name: demoName("Kids"), slug: "kids", order: 3 },
    { name: demoName("Shoes"), slug: "shoes", order: 4 },
    { name: demoName("Accessories"), slug: "accessories", order: 5 },
    { name: demoName("Sleep & Sport"), slug: "sleep-sport", order: 6 },
    { name: demoName("Outfit Sets"), slug: "outfit-sets", order: 7 },
    { name: demoName("Gifts"), slug: "gifts", order: 8 },

    { name: demoName("Dresses"), slug: "women-dresses", order: 1, parentSlug: "women" },
    { name: demoName("Tops & Blouses"), slug: "women-tops", order: 2, parentSlug: "women" },
    { name: demoName("Trousers & Skirts"), slug: "women-bottoms", order: 3, parentSlug: "women" },
    { name: demoName("Coats & Jackets"), slug: "women-outerwear", order: 4, parentSlug: "women" },

    { name: demoName("Shirts"), slug: "men-shirts", order: 1, parentSlug: "men" },
    { name: demoName("Tees & Knitwear"), slug: "men-tees-knit", order: 2, parentSlug: "men" },
    { name: demoName("Trousers & Jeans"), slug: "men-trousers", order: 3, parentSlug: "men" },
    { name: demoName("Suits & Tailoring"), slug: "men-suits", order: 4, parentSlug: "men" },
    { name: demoName("Coats & Jackets"), slug: "men-outerwear", order: 5, parentSlug: "men" },

    { name: demoName("Bags"), slug: "accessories-bags", order: 1, parentSlug: "accessories" },
    { name: demoName("Belts, Scarves & Jewellery"), slug: "accessories-small", order: 2, parentSlug: "accessories" },

    { name: demoName("Sleep & Lounge"), slug: "sleep-lounge", order: 1, parentSlug: "sleep-sport" },
    { name: demoName("Active & Swim"), slug: "active-swim", order: 2, parentSlug: "sleep-sport" },
];

/**
 * Ensures default product categories exist for the company (upsert by company + slug).
 */
export async function createCategories(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<void> {
    const logger = getLogger("mongoDbInitialization-createProductCategories", parentLogger);
    logger.start("Creating product categories...");

    const parentIdBySlug = new Map<string, HydratedDocument<IProductCategory>["_id"]>();

    for (const seed of defaultCategorySeeds) {
        try {
            let parentId: HydratedDocument<IProductCategory>["_id"] | undefined;
            if (seed.parentSlug) {
                const resolved = parentIdBySlug.get(seed.parentSlug);
                if (!resolved) {
                    const parentDoc = await ProductCategory.findOne({
                        slug: seed.parentSlug,
                        company: company._id,
                    }).select("_id");
                    if (!parentDoc) {
                        throw new Error(
                            `Parent category "${seed.parentSlug}" not found when seeding "${seed.slug}"`,
                        );
                    }
                    parentId = parentDoc._id;
                    parentIdBySlug.set(seed.parentSlug, parentId);
                } else {
                    parentId = resolved;
                }
            }

            const baseSet = {
                name: seed.name,
                slug: seed.slug,
                order: seed.order,
            };

            const result = await ProductCategory.updateOne(
                {
                    slug: seed.slug,
                    company: company._id,
                },
                parentId
                    ? {
                          $set: {
                              ...baseSet,
                              parent: parentId,
                          },
                          $setOnInsert: {
                              company: company._id,
                              createdBy: company.createdBy,
                          },
                      }
                    : {
                          $set: baseSet,
                          $unset: { parent: 1 },
                          $setOnInsert: {
                              company: company._id,
                              createdBy: company.createdBy,
                          },
                      },
                { upsert: true },
            );

            const doc = await ProductCategory.findOne({
                slug: seed.slug,
                company: company._id,
            }).select("_id");

            if (doc?._id) {
                parentIdBySlug.set(seed.slug, doc._id);
            }

            if (result.upsertedCount > 0) {
                logger.info(`Created product category '${seed.name}' (${seed.slug})`);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            logger.err(`Error creating product category '${seed.name}': ${message}`);
        }
    }

    logger.finish("Finished creating product categories!");
}
