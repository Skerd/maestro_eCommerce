import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import SavedSearch, {type ISavedSearch} from "./savedSearch";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import type {ShopProductSort} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import type {CreateCollectionsResult} from "@eCommerceModule/database/schemas/collection/collection.defaults";

export type SavedSearchSeed = {
    name: string;
    collectionSlug?: string;
    categorySlugs?: readonly string[];
    priceMin?: number;
    priceMax?: number;
    sort?: ShopProductSort;
};

/** Storefront filter presets for the echo demo customer. */
export const defaultSavedSearchSeeds: readonly SavedSearchSeed[] = [
    {
        name: demoName("Featured picks"),
        collectionSlug: "featured",
        sort: "featured",
    },
    {
        name: demoName("On sale"),
        collectionSlug: "sale",
        sort: "priceAsc",
    },
    {
        name: demoName("New arrivals"),
        collectionSlug: "new-arrivals",
        sort: "newest",
    },
    {
        name: demoName("Under €40"),
        priceMax: 40,
        sort: "priceAsc",
    },
    {
        name: demoName("Men's fashion"),
        categorySlugs: ["fashion-men"],
        sort: "newest",
    },
    {
        name: demoName("Digital downloads"),
        collectionSlug: "digital-downloads",
        sort: "featured",
    },
];

/**
 * Seeds shop saved searches for the demo customer. Idempotent on `{company, customer, name}`.
 */
export async function createSavedSearches(
    parentLogger: serverLogger,
    company: ICompany,
    customerId: Types.ObjectId | undefined,
    collections: CreateCollectionsResult,
): Promise<HydratedDocument<ISavedSearch>[]> {
    const logger = getLogger("mongoDbInitialization-createSavedSearches", parentLogger);
    logger.start("Creating saved searches...");

    if (!customerId) {
        logger.warn("Skipping saved searches: customer echo@echo.com was not found.");
        logger.finish("Finished creating saved searches!", 0);
        return [];
    }

    const created: HydratedDocument<ISavedSearch>[] = [];

    for (const seed of defaultSavedSearchSeeds) {
        try {
            let collectionId: Types.ObjectId | undefined;
            if (seed.collectionSlug) {
                const collection = collections.bySlug[seed.collectionSlug];
                if (!collection) {
                    logger.warn(
                        `Skipping saved search "${seed.name}": collection "${seed.collectionSlug}" was not seeded.`,
                    );
                    continue;
                }
                collectionId = collection._id;
            }

            let categoryIds: Types.ObjectId[] | undefined;
            if (seed.categorySlugs?.length) {
                categoryIds = [];
                for (const slug of seed.categorySlugs) {
                    const category = await ProductCategory.findOne({
                        company: company._id,
                        slug,
                    }).select("_id");
                    if (!category) {
                        logger.warn(
                            `Skipping saved search "${seed.name}": category "${slug}" was not seeded.`,
                        );
                        categoryIds = undefined;
                        break;
                    }
                    categoryIds.push(category._id);
                }
                if (!categoryIds) continue;
            }

            const payload = {
                customer: customerId,
                name: seed.name,
                categoryIds,
                collectionId,
                priceMin: seed.priceMin,
                priceMax: seed.priceMax,
                sort: seed.sort,
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await SavedSearch.findOne({
                company: company._id,
                customer: customerId,
                name: seed.name,
            });
            if (!doc) {
                doc = await SavedSearch.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            created.push(doc);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating saved search '${seed.name}': ${message}`);
        }
    }

    logger.finish("Finished creating saved searches!", created.length);
    return created;
}
