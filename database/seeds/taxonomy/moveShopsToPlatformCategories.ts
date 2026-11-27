import fs from "fs";
import path from "path";
import {ObjectId} from "mongodb";
import type {serverLogger} from "@coreModule/loggers/serverLog";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import Company from "@coreModule/database/schemas/company/company";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import Product from "@eCommerceModule/database/schemas/product/product";
import Collection from "@eCommerceModule/database/schemas/collection/collection";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import PricingRule from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import CmsBlock from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock";
import {buildPlatformCategoryMatcher} from "@eCommerceModule/utilities/services/category/platformCategoryMatch";
import {loadTaxonomyFile, seedProductTaxonomy, type TaxonomyFile} from "@eCommerceModule/database/seeds/taxonomy/productTaxonomy.seed";

type OldCategory = {_id: ObjectId; company: ObjectId; name: string};
type CategoryLine = {name: string; products: number; match: {shopifyId: string; name: string; how: "exact" | "close"} | null};
export type CategoryMoveReport = {
    companies: {companyId: string; company: string; categories: CategoryLine[]}[];
    totals: {categories: number; exact: number; close: number; unmatched: number};
    applied: boolean;
    journal?: string;
};

const ids = (values: unknown): ObjectId[] => (Array.isArray(values) ? values.filter((value): value is ObjectId => value instanceof ObjectId) : []);

/**
 * Moves every shop from its own product categories to the platform's (D195; the architect asked for this move, GLB-06).
 * A shop's category matches a platform one by name (exact, then close) in the taxonomy data; its products, discounts,
 * pricing rules, saved searches and CMS blocks are relinked to the match, and the old category becomes a collection
 * with the same products, so nothing the shop arranged is lost. An unmatched category keeps only its collection and is
 * listed. Old rows are categories with neither a taxonomy id nor a request status (written before D195).
 *
 * The dry run (default) only reports. `apply` first writes a journal of every old category and every reference it
 * changes to `journalDir`, then removes the old rows (their slugs would clash with the platform's), seeds the platform
 * tree, and relinks each company inside its own tenant. Run it once per database before shops use the new categories.
 */
export async function moveShopsToPlatformCategories(params: {
    apply: boolean;
    journalDir: string;
    logger: serverLogger;
    /** The taxonomy to match and seed; the repo's data file by default. */
    taxonomy?: TaxonomyFile | null;
}): Promise<CategoryMoveReport> {
    const {apply, journalDir, logger} = params;
    const taxonomy = params.taxonomy === undefined ? loadTaxonomyFile() : params.taxonomy;
    if (!taxonomy) throw new Error("No product taxonomy data file: build it first (scripts/build-product-taxonomy.ts).");
    const match = buildPlatformCategoryMatcher<string>(taxonomy.categories.map((row) => ({
        id: row.id,
        name: row.name.en,
        names: [row.name.sq, row.name.de, row.name.fr, row.name.it],
        depth: row.id.split("-").length,
        order: row.order,
    })));
    const shopifyName = new Map(taxonomy.categories.map((row) => [row.id, row.name.en]));

    const old: OldCategory[] = (await ProductCategory.collection.find(
        {shopifyId: {$exists: false}, requestStatus: {$exists: false}},
        {projection: {_id: 1, company: 1, name: 1}},
    ).toArray()).map((row) => ({_id: row._id, company: row.company, name: String(row.name ?? "")}));
    const companies = await Company.collection.find({_id: {$in: [...new Set(old.map((row) => String(row.company)))].map((id) => new ObjectId(id))}}, {projection: {name: 1, createdBy: 1}}).toArray();
    const companyName = new Map(companies.map((company) => [String(company._id), String(company.name ?? "")]));

    const report: CategoryMoveReport = {companies: [], totals: {categories: 0, exact: 0, close: 0, unmatched: 0}, applied: false};
    const matchOf = new Map<string, CategoryLine["match"]>();
    for (const companyId of [...new Set(old.map((row) => String(row.company)))]) {
        const lines: CategoryLine[] = [];
        for (const row of old.filter((category) => String(category.company) === companyId)) {
            const found = match(row.name);
            const line: CategoryLine = {
                name: row.name,
                products: await Product.collection.countDocuments({categories: row._id}),
                match: found ? {shopifyId: found.id, name: shopifyName.get(found.id) ?? found.name, how: found.how} : null,
            };
            matchOf.set(String(row._id), line.match);
            lines.push(line);
            report.totals.categories += 1;
            report.totals[line.match ? line.match.how : "unmatched"] += 1;
        }
        report.companies.push({companyId, company: companyName.get(companyId) ?? companyId, categories: lines});
    }
    if (!apply) return report;

    // The journal: every old category and every reference this move rewrites, before anything changes.
    const oldIds = old.map((row) => row._id);
    const journal = {
        at: new Date().toISOString(),
        categories: old,
        products: await Product.collection.find({categories: {$in: oldIds}}, {projection: {categories: 1, collections: 1, company: 1}}).toArray(),
        discounts: await Discount.collection.find({appliesTo: "category", targetIds: {$in: oldIds}}, {projection: {targetIds: 1, company: 1}}).toArray(),
        pricingRules: await PricingRule.collection.find({appliesTo: "category", targetIds: {$in: oldIds}}, {projection: {targetIds: 1, company: 1}}).toArray(),
        savedSearches: await SavedSearch.collection.find({categoryIds: {$in: oldIds}}, {projection: {categoryIds: 1, company: 1}}).toArray(),
        cmsBlocks: await CmsBlock.collection.find({"config.categoryIds": {$in: oldIds}}, {projection: {"config.categoryIds": 1, company: 1}}).toArray(),
    };
    fs.mkdirSync(journalDir, {recursive: true});
    const journalFile = path.join(journalDir, `category-move-${journal.at.replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(journalFile, JSON.stringify(journal));
    report.journal = journalFile;
    logger.info(`Journal written: ${journalFile}`);

    // The old rows go first: their slugs would clash with the platform tree's, and the slug index is now platform-wide.
    await ProductCategory.collection.deleteMany({_id: {$in: oldIds}});
    await ProductCategory.syncIndexes();
    const platform = await Company.findOne({isPlatformOwner: true});
    if (!platform) throw new Error("No platform company: the platform categories cannot be seeded.");
    await seedProductTaxonomy({platformCompany: platform, logger}, taxonomy);
    const platformIdOf = new Map((await ProductCategory.collection.find({shopifyId: {$type: "string"}}, {projection: {_id: 1, shopifyId: 1}}).toArray())
        .map((row) => [String(row.shopifyId), row._id]));
    const newIdOf = (oldId: ObjectId): ObjectId | undefined => {
        const found = matchOf.get(String(oldId));
        return found ? platformIdOf.get(found.shopifyId) : undefined;
    };
    const relink = (values: unknown): ObjectId[] => {
        const result: ObjectId[] = [];
        for (const id of ids(values)) {
            const next = oldIds.some((oldId) => oldId.equals(id)) ? newIdOf(id) : id;
            if (next && !result.some((kept) => kept.equals(next))) result.push(next);
        }
        return result;
    };

    for (const entry of report.companies) {
        const companyId = new ObjectId(entry.companyId);
        const createdBy = companies.find((company) => String(company._id) === entry.companyId)?.createdBy;
        await withTenant(companyId, async () => {
            // Each old category becomes a collection holding the same products.
            const collectionOf = new Map<string, ObjectId>();
            for (const row of old.filter((category) => category.company.equals(companyId))) {
                const productIds = journal.products.filter((product) => ids(product.categories).some((id) => id.equals(row._id))).map((product) => product._id);
                const collection = await Collection.create({type: "manual", name: row.name, isVisible: true, products: productIds, company: companyId, createdBy});
                collectionOf.set(String(row._id), collection._id);
            }
            for (const product of journal.products.filter((row) => companyId.equals(row.company))) {
                const added = ids(product.categories).map((id) => collectionOf.get(String(id))).filter((id): id is ObjectId => !!id);
                await Product.updateOne({_id: product._id}, {$set: {categories: relink(product.categories)}, $addToSet: {collections: {$each: added}}});
            }
            for (const row of journal.discounts.filter((discount) => companyId.equals(discount.company))) {
                await Discount.updateOne({_id: row._id}, {$set: {targetIds: relink(row.targetIds)}});
            }
            for (const row of journal.pricingRules.filter((rule) => companyId.equals(rule.company))) {
                await PricingRule.updateOne({_id: row._id}, {$set: {targetIds: relink(row.targetIds)}});
            }
            for (const row of journal.savedSearches.filter((search) => companyId.equals(search.company))) {
                await SavedSearch.updateOne({_id: row._id}, {$set: {categoryIds: relink(row.categoryIds)}});
            }
            for (const row of journal.cmsBlocks.filter((block) => companyId.equals(block.company))) {
                await CmsBlock.updateOne({_id: row._id}, {$set: {"config.categoryIds": relink(row.config?.categoryIds)}});
            }
        });
        logger.info(`Moved ${entry.company}: ${entry.categories.length} categories.`);
    }
    report.applied = true;
    return report;
}
