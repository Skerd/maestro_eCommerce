import {describe, expect, it} from "vitest";
import {applyShopCatalogRefinement} from "../utilities/shop/shopCatalogRefinement";

describe("shop catalog refinement", () => {
    it("leaves the filter unchanged when nothing is selected", () => {
        const filter: Record<string, unknown> = {status: "active"};
        applyShopCatalogRefinement(filter, {});
        expect(filter).toEqual({status: "active"});
    });

    it("appends a price clause without replacing collection rules", () => {
        const filter: Record<string, unknown> = {$and: [{featured: true}]};
        applyShopCatalogRefinement(filter, {priceMin: 40, priceMax: 10, brands: []});
        expect(filter.$and).toEqual([
            {featured: true},
            {price: {$gte: 10, $lte: 40}},
        ]);
    });

    it("matches availability, sale price, brand, and rating", () => {
        const filter: Record<string, unknown> = {company: "c"};
        applyShopCatalogRefinement(filter, {
            inStock: true,
            onSale: true,
            brands: ["Nova"],
            types: ["physical"],
            minRating: 4,
        });
        expect(filter.$and).toEqual([
            {availableForSale: {$ne: false}},
            {$expr: {$gt: ["$compareAtPrice", "$price"]}},
            {brand: {$in: ["Nova"]}},
            {type: {$in: ["physical"]}},
            {ratingAverage: {$gte: 4}},
        ]);
    });

    it("accepts a product attribute or a variant that carries it", () => {
        const filter: Record<string, unknown> = {};
        applyShopCatalogRefinement(
            filter,
            {attributes: [{name: "Color", values: ["Black"]}]},
            new Map([["Color", ["p1"]]]),
        );
        expect(filter.$and).toEqual([{
            $or: [
                {attributes: {$elemMatch: {name: "Color", values: {$in: ["Black"]}}}},
                {_id: {$in: ["p1"]}},
            ],
        }]);
    });
});
