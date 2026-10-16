export type ShopCatalogRefinement = {
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
    onSale?: boolean;
    brands?: readonly string[];
    types?: readonly string[];
    attributes?: readonly {name: string; values: readonly string[]}[];
    minRating?: number;
};

function pushAnd(filter: Record<string, unknown>, clause: Record<string, unknown>) {
    const existing = filter.$and;
    if (Array.isArray(existing)) {
        existing.push(clause);
        return;
    }
    filter.$and = [clause];
}

/**
 * Narrows a catalog filter. Clauses go into `$and` so a collection rule that
 * already set `price` or `brand` stays in force alongside the shopper's choice.
 * `variantProductIds` lists products whose variants carry that attribute.
 */
export function applyShopCatalogRefinement(
    filter: Record<string, unknown>,
    refinement: ShopCatalogRefinement,
    variantProductIds?: ReadonlyMap<string, readonly unknown[]>,
): void {
    let priceMin = refinement.priceMin;
    let priceMax = refinement.priceMax;
    if (priceMin != null && priceMax != null && priceMin > priceMax) {
        const swap = priceMin;
        priceMin = priceMax;
        priceMax = swap;
    }
    if (priceMin != null || priceMax != null) {
        const price: {$gte?: number; $lte?: number} = {};
        if (priceMin != null) price.$gte = priceMin;
        if (priceMax != null) price.$lte = priceMax;
        pushAnd(filter, {price});
    }

    if (refinement.inStock) pushAnd(filter, {availableForSale: {$ne: false}});
    if (refinement.onSale) pushAnd(filter, {$expr: {$gt: ["$compareAtPrice", "$price"]}});
    if (refinement.brands && refinement.brands.length > 0) pushAnd(filter, {brand: {$in: refinement.brands}});
    if (refinement.types && refinement.types.length > 0) pushAnd(filter, {type: {$in: refinement.types}});
    if (refinement.minRating != null) pushAnd(filter, {ratingAverage: {$gte: refinement.minRating}});

    for (const attribute of refinement.attributes ?? []) {
        if (!attribute.name || attribute.values.length === 0) continue;
        pushAnd(filter, {
            $or: [
                {attributes: {$elemMatch: {name: attribute.name, values: {$in: attribute.values}}}},
                {_id: {$in: variantProductIds?.get(attribute.name) ?? []}},
            ],
        });
    }
}
