import {describe, expect, it, vi} from "vitest";

vi.mock("@eCommerceModule/database/schemas/category/category", () => ({
    default: {
        find: vi.fn().mockReturnValue({lean: vi.fn().mockResolvedValue([])}),
    },
}));
vi.mock("@eCommerceModule/database/schemas/collection/collection", () => ({
    default: {
        findOne: vi.fn(),
        find: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock("@eCommerceModule/database/schemas/productAttribute/productAttribute", () => ({
    default: {find: vi.fn()},
}));
vi.mock("@eCommerceModule/database/schemas/productVariant/productVariant", () => ({
    default: {find: vi.fn()},
}));
vi.mock("@eCommerceModule/utilities/services/collection/collectionMembership", () => ({
    applyCollectionMembershipToProductFilter: vi.fn(),
}));

describe("buildShopCatalogFilter platform", () => {
    it("omits company when companyId is undefined", async () => {
        const {buildShopCatalogFilter} = await import("../shopCatalogFilter");
        const filter = await buildShopCatalogFilter({});
        expect(filter).toEqual({status: "active"});
        expect(filter).not.toHaveProperty("company");
    });

    it("includes company when companyId is set", async () => {
        const {buildShopCatalogFilter} = await import("../shopCatalogFilter");
        const filter = await buildShopCatalogFilter({companyId: "abc"});
        expect(filter).toEqual({status: "active", company: "abc"});
    });
});
