import ProductAttribute from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import Category from "@eCommerceModule/database/schemas/category/category";
import Collection from "@eCommerceModule/database/schemas/collection/collection";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {applyCollectionMembershipToProductFilter} from "@eCommerceModule/utilities/services/collection/collectionMembership";
import {applyShopCatalogRefinement, type ShopCatalogRefinement} from "./shopCatalogRefinement";
import {liveSellerCompanyClause} from "./shopLiveSellers";

export type ShopCatalogScope = {
    /** When omitted, platform catalog — all active companies. */
    companyId?: unknown;
    search?: string;
    categorySlug?: string;
    categoryIds?: string[];
    collectionSlug?: string;
    collectionId?: string;
};

/** The category and every category below it, at any depth. */
async function withDescendantCategories(
    companyClause: Record<string, unknown>,
    rootId: unknown,
): Promise<unknown[]> {
    const categories = await Category.find(companyClause, {_id: 1, parent: 1}).lean();
    const ids = [String(rootId)];
    for (let i = 0; i < ids.length; i++) {
        for (const category of categories) {
            const id = String(category._id);
            if (category.parent && String(category.parent) === ids[i] && !ids.includes(id)) ids.push(id);
        }
    }
    return categories.filter(category => ids.includes(String(category._id))).map(category => category._id);
}

/**
 * Active storefront products in the browse scope. `null` when the requested
 * category or collection does not exist — the caller returns an empty page.
 * Ambiguous platform slugs (multiple companies share the slug) also return null.
 */
export async function buildShopCatalogFilter(scope: ShopCatalogScope): Promise<Record<string, unknown> | null> {
    const filter: Record<string, unknown> = {
        status: "active",
    };

    // Platform: only products owned by live companies (seed leftovers without a company stay out).
    const companyClause: Record<string, unknown> = scope.companyId != null
        ? {company: scope.companyId}
        : await liveSellerCompanyClause();
    filter.company = companyClause.company;

    const search = scope.search?.trim();
    if (search) filter.title = {$regex: escapeRegex(search), $options: "i"};

    if (scope.categoryIds && scope.categoryIds.length > 0) {
        const categories = await Category.find({...companyClause, _id: {$in: scope.categoryIds}}, {_id: 1});
        if (categories.length === 0) return null;
        filter.categories = {$in: categories.map(category => category._id)};
    } else if (scope.categorySlug) {
        const matches = await Category.find(
            {...companyClause, slug: scope.categorySlug.toLowerCase()},
            {_id: 1},
        ).lean();
        if (matches.length === 0) return null;
        if (scope.companyId == null && matches.length > 1) return null;
        filter.categories = {$in: await withDescendantCategories(companyClause, matches[0]._id)};
    }

    const collectionFields = {_id: 1, type: 1, company: 1, products: 1, rules: 1, ruleCondition: 1};
    if (scope.collectionId) {
        const collection = await Collection.findOne(
            {...companyClause, _id: scope.collectionId, isVisible: true},
            collectionFields,
        );
        if (!collection) return null;
        applyCollectionMembershipToProductFilter(collection, filter);
    } else if (scope.collectionSlug) {
        const matches = await Collection.find(
            {...companyClause, slug: scope.collectionSlug.toLowerCase(), isVisible: true},
            collectionFields,
        );
        if (matches.length === 0) return null;
        if (scope.companyId == null && matches.length > 1) return null;
        applyCollectionMembershipToProductFilter(matches[0], filter);
    }

    return filter;
}

/** Products that have an active variant carrying each requested attribute name. */
async function variantProductIdsByAttribute(
    companyId: unknown | undefined,
    groups: ShopCatalogRefinement["attributes"],
): Promise<Map<string, unknown[]> | undefined> {
    if (!groups || groups.length === 0) return undefined;

    const names = [...new Set(groups.map(group => group.name))];
    const attributeFilter: Record<string, unknown> = {name: {$in: names}};
    if (companyId != null) attributeFilter.company = companyId;
    const attributes = await ProductAttribute.find(attributeFilter)
        .select("name")
        .noDeleted()
        .lean();

    const idsByName = new Map<string, unknown[]>();
    for (const attribute of attributes) {
        const ids = idsByName.get(attribute.name) ?? [];
        ids.push(attribute._id);
        idsByName.set(attribute.name, ids);
    }

    const result = new Map<string, unknown[]>();
    for (const group of groups) result.set(group.name, []);

    const clauses = groups.flatMap(group => {
        const ids = idsByName.get(group.name);
        if (!ids || ids.length === 0) return [];
        return [{attributeCombination: {$elemMatch: {attribute: {$in: ids}, value: {$in: group.values}}}}];
    });
    if (clauses.length === 0) return result;

    const variantFilter: Record<string, unknown> = {status: "active", $or: clauses};
    if (companyId != null) variantFilter.company = companyId;
    const variants = await ProductVariant.find(variantFilter)
        .select("product attributeCombination")
        .noDeleted()
        .lean();

    for (const group of groups) {
        const idSet = new Set((idsByName.get(group.name) ?? []).map(id => String(id)));
        const values = new Set(group.values);
        const seen = new Set<string>();
        const productIds: unknown[] = [];
        for (const variant of variants) {
            const matches = variant.attributeCombination?.some(combo =>
                combo.value != null && values.has(combo.value) && idSet.has(String(combo.attribute)),
            );
            if (!matches) continue;
            const key = String(variant.product);
            if (seen.has(key)) continue;
            seen.add(key);
            productIds.push(variant.product);
        }
        result.set(group.name, productIds);
    }
    return result;
}

export async function refineShopCatalogFilter(
    filter: Record<string, unknown>,
    refinement: ShopCatalogRefinement,
): Promise<void> {
    const variantProductIds = await variantProductIdsByAttribute(filter.company, refinement.attributes);
    applyShopCatalogRefinement(filter, refinement, variantProductIds);
}
