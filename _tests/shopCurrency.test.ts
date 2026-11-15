import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import {ObjectId} from "mongodb";
import Currency from "@coreModule/database/schemas/currency/currency";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {shopCurrencyOf, withShopCurrency} from "@eCommerceModule/utilities/services/shopCurrency";

const platformId = new ObjectId();
const shopId = new ObjectId();
const asShop = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(shopId, fn);

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

describe("the shop currency (P10.2, D160)", () => {
    it("is the oldest row of the platform's currency list, and records without a currency of their own are read in it", () => asShop(async () => {
        expect(await shopCurrencyOf("en-US")).toBeUndefined();
        expect(await withShopCurrency([{_id: "d1"}], "en-US")).toEqual([{_id: "d1"}]);

        // Currencies are a platform list: the platform company owns every row and each shop reads them all.
        await Currency.collection.insertMany([
            {name: "Swiss franc", symbol: "CHF", decimalPlaces: 2, abbreviation: "CHF", company: platformId, createdAt: new Date("2026-03-01"), deletedAt: null},
            {name: "Euro", symbol: "€", decimalPlaces: 2, abbreviation: "EUR", company: platformId, createdAt: new Date("2025-01-01"), deletedAt: null},
        ]);

        expect((await shopCurrencyOf("en-US"))?.abbreviation).toBe("EUR");
        const [discount] = await withShopCurrency([{_id: "d1", value: 5}], "en-US");
        expect(discount.currency).toMatchObject({symbol: "€", abbreviation: "EUR", decimalPlaces: 2});
    }));
});
