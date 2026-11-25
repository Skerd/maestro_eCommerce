import {describe, expect, it, vi} from "vitest";
import {buildShopCatalogFilter} from "../shopCatalogFilter";

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
vi.mock("../shopLiveSellers", () => ({
    liveSellerCompanyClause: vi.fn().mockResolvedValue({company: {$in: ["live-seller"]}}),
}));

describe("buildShopCatalogFilter platform", () => {
    it("limits platform browsing to live seller companies when companyId is undefined", async () => {
        const filter = await buildShopCatalogFilter({});
        // A product the platform hid after a report is never browsed (D191).
        expect(filter).toEqual({status: "active", hiddenByPlatform: {$ne: true}, company: {$in: ["live-seller"]}});
    });

    it("includes company when companyId is set", async () => {
        const filter = await buildShopCatalogFilter({companyId: "abc"});
        expect(filter).toEqual({status: "active", hiddenByPlatform: {$ne: true}, company: "abc"});
    });
});
