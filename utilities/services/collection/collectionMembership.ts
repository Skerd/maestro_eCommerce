import {Types} from "mongoose";
import Product from "@eCommerceModule/database/schemas/product/product";
import type {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {buildProductFilterFromCollectionRules} from "@eCommerceModule/utilities/services/collectionRuleEngine";

function companyIdOf(collection: ICollection): Types.ObjectId | string {
    const company = collection.company;
    if (company instanceof Types.ObjectId || typeof company === "string") return company;
    return company._id;
}

function productIdsOf(collection: ICollection): Array<Types.ObjectId | string> {
    if (!collection.products?.length) return [];
    return collection.products.map((product) =>
        product instanceof Types.ObjectId || typeof product === "string" ? product : product._id,
    );
}

/**
 * Applies collection membership to an existing product query filter.
 * Manual → `$in` stored products. Dynamic → live rule clauses (empty rules match nothing).
 */
export function applyCollectionMembershipToProductFilter(
    collection: ICollection,
    filter: Record<string, unknown>,
): void {
    if (collection.type === "dynamic") {
        const rules = collection.rules ?? [];
        if (rules.length === 0) {
            filter._id = {$in: []};
            return;
        }
        const ruleFilter = buildProductFilterFromCollectionRules(
            companyIdOf(collection),
            rules,
            collection.ruleCondition ?? "all",
        );
        const {company: _c, status: _s, deletedAt: _d, ...ruleClauses} = ruleFilter;
        Object.assign(filter, ruleClauses);
        return;
    }

    filter._id = {$in: productIdsOf(collection)};
}

/** Live product count for a collection (rules for dynamic, stored list for manual). */
export async function countCollectionProducts(
    collection: ICollection,
    companyId: Types.ObjectId | string,
): Promise<number> {
    if (collection.type === "dynamic") {
        const rules = collection.rules ?? [];
        if (rules.length === 0) return 0;
        return Product.countDocuments(
            buildProductFilterFromCollectionRules(
                companyId,
                rules,
                collection.ruleCondition ?? "all",
            ),
        );
    }
    return productIdsOf(collection).length;
}
