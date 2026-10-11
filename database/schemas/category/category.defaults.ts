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

/** Product-commerce taxonomy (retail / SKU catalog). Independent of marketplace ListingCategory. */
const defaultCategorySeeds: readonly CategorySeed[] = [
    { name: demoName("Electronics"), slug: "electronics", order: 1 },
    { name: demoName("Fashion"), slug: "fashion", order: 2 },
    { name: demoName("Home & Living"), slug: "home-living", order: 3 },
    { name: demoName("Health & Beauty"), slug: "health-beauty", order: 4 },
    { name: demoName("Sports & Outdoors"), slug: "sports-outdoors", order: 5 },
    { name: demoName("Food & Grocery"), slug: "food-grocery", order: 6 },

    { name: demoName("Phones & Tablets"), slug: "electronics-phones", order: 1, parentSlug: "electronics" },
    { name: demoName("Computers"), slug: "electronics-computers", order: 2, parentSlug: "electronics" },
    { name: demoName("Audio"), slug: "electronics-audio", order: 3, parentSlug: "electronics" },

    { name: demoName("Men"), slug: "fashion-men", order: 1, parentSlug: "fashion" },
    { name: demoName("Women"), slug: "fashion-women", order: 2, parentSlug: "fashion" },
    { name: demoName("Kids"), slug: "fashion-kids", order: 3, parentSlug: "fashion" },

    { name: demoName("Furniture"), slug: "home-furniture", order: 1, parentSlug: "home-living" },
    { name: demoName("Kitchen"), slug: "home-kitchen", order: 2, parentSlug: "home-living" },
    { name: demoName("Decor"), slug: "home-decor", order: 3, parentSlug: "home-living" },
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
