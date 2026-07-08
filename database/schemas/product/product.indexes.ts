import {Schema} from "mongoose";

export function applyProductIndexes(ProductSchema: Schema): void {
    // Core listing / filtering
    ProductSchema.index({company: 1, status: 1});
    ProductSchema.index({company: 1, createdAt: -1});
    ProductSchema.index({company: 1, slug: 1}, {unique: true});
    ProductSchema.index({company: 1, type: 1});
    ProductSchema.index({company: 1, sku: 1}, {sparse: true});
    ProductSchema.index({company: 1, tags: 1});
    ProductSchema.index({company: 1, categories: 1});
    ProductSchema.index({company: 1, collections: 1});
    ProductSchema.index({company: 1, brand: 1});
    ProductSchema.index({company: 1, price: 1});

    // Merchandising / availability filters
    ProductSchema.index({company: 1, featured: 1});
    ProductSchema.index({company: 1, availableForSale: 1});
    ProductSchema.index({company: 1, saleStartsAt: 1, saleEndsAt: 1});

    // Global trade identifiers — unique per company only when present (partial index).
    ProductSchema.index({company: 1, gtin: 1}, {unique: true, partialFilterExpression: {gtin: {$type: "string"}}});
    ProductSchema.index({company: 1, upc: 1}, {unique: true, partialFilterExpression: {upc: {$type: "string"}}});
    ProductSchema.index({company: 1, ean: 1}, {unique: true, partialFilterExpression: {ean: {$type: "string"}}});

    // Full-text search
    ProductSchema.index(
        {title: "text", description: "text", tags: "text", sku: "text"},
        {
            weights: {title: 10, tags: 5, sku: 8, description: 1},
            name: "product_text_search",
        },
    );
}
