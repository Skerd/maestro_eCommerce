import type {ClientSession} from "mongoose";
import ProductCollection, {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import Product from "@eCommerceModule/database/schemas/product/product";
import {buildProductFilterFromCollectionRules} from "@eCommerceModule/utilities/services/collectionRuleEngine";

export type RebuildableCollection = Pick<
    ICollection,
    "_id" | "company" | "type" | "rules" | "ruleCondition"
>;

/**
 * Materializes `products[]` for a dynamic collection from its rules.
 * Empty rules clear membership (avoids matching every active product).
 * Returns the new product count, or `null` if the collection is not dynamic.
 */
export async function rebuildDynamicCollectionMembership(collection: RebuildableCollection, options?: {session?: ClientSession},): Promise<number | null> {
    if (collection.type !== "dynamic") return null;

    const rules = (collection.rules as {field: string; operator: string; value: string}[]) ?? [];
    let productIds: ICollection["products"] = [];

    if (rules.length > 0) {
        const mongoFilter = buildProductFilterFromCollectionRules(
            collection.company as any,
            rules,
            collection.ruleCondition ?? "all",
        );
        const query = Product.find(mongoFilter, {_id: 1}).lean();
        if (options?.session) query.session(options.session);
        const matchingProducts = await query;
        productIds = matchingProducts.map((p) => p._id);
    }

    await ProductCollection.updateOne(
        {_id: collection._id},
        {$set: {products: productIds}},
        options?.session ? {session: options.session} : undefined,
    );

    return productIds.length;
}
