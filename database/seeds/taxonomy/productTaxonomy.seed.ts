import fs from "fs";
import path from "path";
import {ObjectId} from "mongodb";
import type {PlatformListsContext} from "@coreModule/utilities/modules/moduleCompanyDefaults";
import {getLogger} from "@coreModule/loggers/serverLog";
import ProductCategory, {categorySearchText, type CategoryNames} from "@eCommerceModule/database/schemas/category/category";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";

/** One row of `productTaxonomy.json`, built by `scripts/build-product-taxonomy.ts`. */
export type TaxonomyRow = {id: string; parent: string | null; order: number; slug: string; name: Required<CategoryNames>};
export type TaxonomyFile = {source: {release: string}; categories: TaxonomyRow[]};

const DATA_FILE = path.join(__dirname, "productTaxonomy.json");

/** The taxonomy data file built by `scripts/build-product-taxonomy.ts`, or null when it is missing. */
export function loadTaxonomyFile(): TaxonomyFile | null {
    return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as TaxonomyFile : null;
}

type ExistingRow = {_id: ObjectId; shopifyId: string; name: string; names?: CategoryNames; parent?: ObjectId; order: number; deletedAt?: Date | null};

/**
 * Seeds the platform product categories (D195) from the taxonomy data file: the `platformLists` hook of eCommerce's
 * module bootstrap, run at every database setup. Rows are matched by their taxonomy id, so a newer data file adds the
 * new categories, renames and moves the changed ones, and hides (soft-deletes) the ones that left the taxonomy; a hidden
 * row keeps every product that links to it. Categories shops requested (no taxonomy id) are never touched.
 */
export async function seedProductTaxonomy(
    {platformCompany, logger: parentLogger}: PlatformListsContext,
    data: TaxonomyFile | null = loadTaxonomyFile(),
): Promise<void> {
    const logger = getLogger("mongoDbInitialization-productTaxonomy", parentLogger);
    if (!data) {
        logger.warn("No product taxonomy data file; platform product categories not seeded.");
        return;
    }
    logger.start(`Seeding ${data.categories.length} platform product categories (taxonomy ${data.source.release})...`);

    const existing: ExistingRow[] = (await categoryService.find(
        {shopifyId: {$type: "string"}},
        {withDeleted: true},
        undefined,
        "_id shopifyId name names parent order deletedAt",
    )).map((row) => ({
        _id: row._id,
        shopifyId: row.shopifyId ?? "",
        name: row.name,
        names: row.names,
        parent: nestedEntityToRef(row.parent),
        order: row.order,
        deletedAt: row.deletedAt,
    }));
    const byShopifyId = new Map(existing.map((row) => [row.shopifyId, row]));
    // Slugs shops' requested categories already hold stay theirs; a taxonomy row takes its id-suffixed slug instead.
    const takenSlugs = new Set((await categoryService.find({shopifyId: {$not: {$type: "string"}}}, {withDeleted: true}, undefined, "slug"))
        .map((row) => row.slug));

    const idOf = new Map<string, ObjectId>(existing.map((row) => [row.shopifyId, row._id]));
    for (const row of data.categories) if (!idOf.has(row.id)) idOf.set(row.id, new ObjectId());

    const now = new Date();
    const inserts: InstanceType<typeof ProductCategory>[] = [];
    const updates: {updateOne: {filter: object; update: object}}[] = [];
    for (const row of data.categories) {
        const parent = row.parent ? idOf.get(row.parent) : undefined;
        const current = byShopifyId.get(row.id);
        if (!current) {
            inserts.push(new ProductCategory({
                _id: idOf.get(row.id),
                company: platformCompany._id,
                createdBy: platformCompany.createdBy,
                name: row.name.en,
                names: row.name,
                slug: takenSlugs.has(row.slug) ? `${row.slug}-${row.id}` : row.slug,
                parent,
                order: row.order,
                shopifyId: row.id,
                searchText: categorySearchText(row.name.en, row.name),
                requestStatus: "approved",
            }));
            continue;
        }
        const sameNames = (["en", "sq", "de", "fr", "it"] as const).every((language) => current.names?.[language] === row.name[language]);
        const sameParent = String(current.parent ?? "") === String(parent ?? "");
        if (sameNames && sameParent && current.name === row.name.en && current.order === row.order && !current.deletedAt) continue;
        updates.push({updateOne: {
            filter: {_id: current._id},
            update: {$set: {name: row.name.en, names: row.name, parent: parent ?? null, order: row.order, searchText: categorySearchText(row.name.en, row.name), deletedAt: null, updatedAt: now}},
        }});
    }

    const inFile = new Set(data.categories.map((row) => row.id));
    const gone = existing.filter((row) => !inFile.has(row.shopifyId) && !row.deletedAt).map((row) => row._id);

    if (inserts.length > 0) await ProductCategory.bulkSave(inserts);
    if (updates.length > 0) await ProductCategory.bulkWrite(updates);
    if (gone.length > 0) await ProductCategory.updateMany({_id: {$in: gone}}, {$set: {deletedAt: now}});
    logger.finish(`Platform product categories: ${inserts.length} added, ${updates.length} updated, ${gone.length} hidden.`);
}
