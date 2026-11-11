import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import {ObjectId} from "mongodb";
import Currency from "@coreModule/database/schemas/currency/currency";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {shopCurrencyOf, withShopCurrency} from "@eCommerceModule/utilities/services/shopCurrency";

const companyId = new ObjectId();
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(companyId, fn);

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

describe("the shop currency (P10.2)", () => {
    it("is the company's oldest currency, and records without a currency of their own are read in it", () => asCompany(async () => {
        expect(await shopCurrencyOf(companyId, "en-US")).toBeUndefined();
        expect(await withShopCurrency([{_id: "d1"}], companyId, "en-US")).toEqual([{_id: "d1"}]);

        await Currency.create({name: "Lek", symbol: "L", decimalPlaces: 2, abbreviation: "ALL", company: companyId, createdAt: new Date("2026-01-02")} as any);
        // Written past the tenant guard: another company's currency, as it sits in the shared collection.
        await Currency.collection.insertOne({name: "Euro", symbol: "€", decimalPlaces: 2, abbreviation: "EUR", company: new ObjectId(), createdAt: new Date("2025-01-01")});
        await Currency.create({name: "Swiss franc", symbol: "CHF", decimalPlaces: 2, abbreviation: "CHF", company: companyId, createdAt: new Date("2026-03-01")} as any);

        // Another company's older currency never counts.
        expect((await shopCurrencyOf(companyId, "en-US"))?.abbreviation).toBe("ALL");
        const [discount] = await withShopCurrency([{_id: "d1", value: 5}], companyId, "en-US");
        expect(discount.currency).toMatchObject({symbol: "L", abbreviation: "ALL", decimalPlaces: 2});
    }));
});
