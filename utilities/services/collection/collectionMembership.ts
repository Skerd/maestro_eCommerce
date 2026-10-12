import {Types, type ClientSession} from "mongoose";
import Product from "@eCommerceModule/database/schemas/product/product";
import Collection, {type ICollection} from "@eCommerceModule/database/schemas/collection/collection";
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
        const {company: _c, status: _s, ...ruleClauses} = ruleFilter;
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
        ).noDeleted();
    }
    return productIdsOf(collection).length;
}

/**
 * The collections each product belongs to, resolved from the collections
 * themselves (manual product list or live rules), the same way the storefront
 * lists them. Discounts and pricing rules that target collections use this.
 */
export async function collectionIdsByProduct(
    productIds: Types.ObjectId[],
    companyId: Types.ObjectId,
    session?: ClientSession | null,
): Promise<Map<string, string[]>> {
    const byProduct = new Map(productIds.map(id => [id.toString(), [] as string[]]));
    if (productIds.length === 0) return byProduct;

    const collections = await Collection.find({company: companyId}).noDeleted().session(session ?? null);
    for (const collection of collections) {
        let members: string[];
        if (collection.type === "dynamic") {
            const ruleFilter: Record<string, unknown> = {};
            applyCollectionMembershipToProductFilter(collection, ruleFilter);
            const matches = await Product.find({$and: [{_id: {$in: productIds}, company: companyId}, ruleFilter]}, {_id: 1})
                .noDeleted().session(session ?? null).lean();
            members = matches.map(product => product._id.toString());
        } else {
            const listed = new Set(productIdsOf(collection).map(String));
            members = productIds.map(String).filter(id => listed.has(id));
        }
        for (const productId of members) byProduct.get(productId)?.push(collection._id.toString());
    }
    return byProduct;
}
