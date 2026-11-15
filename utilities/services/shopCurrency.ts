import {ObjectId} from "mongodb";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import {currencyService} from "@coreModule/database/schemas/currency/currency.service";

/**
 * The shop's base currency: the oldest row of the platform's currency list (D160), the same for every shop and the
 * apex. The storefront prices in it, and records without a currency of their own (discount and pricing-rule amounts,
 * shipping rates, refunds, stock unit costs, saved-search price ranges) are read in it (UX-07).
 */
export async function shopCurrencyOf(languageCode: string): Promise<CurrencySimple | undefined> {
    const [currency] = await currencyService.find(
        {},
        {languageCode},
        undefined,
        "name symbol abbreviation decimalPlaces",
        {createdAt: 1},
        1,
    );
    if (!currency) return undefined;
    return {
        _id: currency._id.toString(),
        name: currency.name,
        symbol: currency.symbol,
        abbreviation: currency.abbreviation,
        decimalPlaces: currency.decimalPlaces,
    };
}

/** Records with the shop currency their amounts are in, so the panel shows "€12" instead of a bare number. */
export async function withShopCurrency<T extends object>(dtos: T[], languageCode: string): Promise<(T & {currency?: CurrencySimple})[]> {
    const currency = await shopCurrencyOf(languageCode);
    return currency ? dtos.map((dto) => ({...dto, currency})) : dtos;
}

/** The shop currency as a reference, the default for a new record priced without one (UX-06). */
export async function shopCurrencyRefOf(languageCode: string): Promise<ObjectId | undefined> {
    const currency = await shopCurrencyOf(languageCode);
    return currency ? new ObjectId(currency._id) : undefined;
}
