import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {COMMERCE_PROVIDERS} from "@eCommerceModule/environment";
import {taxZoneService} from "@eCommerceModule/database/schemas/taxZone/taxZone.service";
import {resolveZoneState, sellerCountryId} from "@eCommerceModule/utilities/services/zoneState";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {allocateMinor, DEFAULT_DECIMAL_PLACES, includedPercentOfMinor, minorToNumber, percentOfMinor, sumMinor, toMinor} from "armonia/src/modules/core/helpers/money";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";

export type ShippingAddress = {
    country?: string;
    state?: string;
    postalCode?: string;
};

/** One applied rate, as stored on the checkout / order `taxBreakdown`. */
export type TaxBreakdownLine = {name: string; rate: number; amount: number};

export type TaxResult = {amount: number; breakdown: TaxBreakdownLine[]};

export type TaxLineContext = {
    /** When omitted, all rates with appliesTo "all" are used */
    productType?: "physical" | "digital";
    /** The currency's `decimalPlaces`, where each rate's amount is rounded (default 2, TD-B38). */
    decimalPlaces?: number;
    /** The caller's transaction, when it runs in one: a provider reads its own data (tax zones) through it (TD-B74). */
    session?: ClientSession;
};

/**
 * Provider seam (§2.C): `calculateTax` stays the single call-site facade;
 * external calculators (Avalara, TaxJar, …) implement this interface and
 * register under their env-selectable name. InternalZones is the default.
 * `context.session` is the caller's transaction when there is one; a provider that reads the database reads through it,
 * so it sees what the transaction wrote (BE-04).
 */
export interface TaxCalculatorProvider {
    readonly name: string;
    calculate(
        subtotal: number,
        shippingAddress: ShippingAddress,
        companyId: ObjectId,
        context: TaxLineContext,
    ): Promise<TaxResult>;
}

function matchesPostalCode(postalCode: string | undefined, patterns: string[] | undefined): boolean {
    if (!patterns?.length) return true;
    if (!postalCode) return false;
    return patterns.some((pattern) => {
        // Only `*` is a wildcard; everything else in the configured pattern is literal
        const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`, "i");
        return regex.test(postalCode);
    });
}

function zoneMatchesAddress(
    zone: {states?: unknown[]; postalCodePatterns?: string[]},
    state?: string,
    postalCode?: string,
): boolean {
    const states = (zone.states ?? []) as {toString(): string}[];
    if (states.length > 0) {
        if (!state) return false;
        if (!states.some((s) => s.toString() === state)) return false;
    }
    return matchesPostalCode(postalCode, zone.postalCodePatterns);
}

function rateApplies(appliesTo: string, productType?: "physical" | "digital"): boolean {
    if (appliesTo === "all") return true;
    if (!productType) return appliesTo === "all";
    return appliesTo === productType;
}

const internalZonesTaxProvider: TaxCalculatorProvider = {
    name: "internal",
    async calculate(subtotal, shippingAddress, companyId, context) {
        if (!shippingAddress.country) return {amount: 0, breakdown: []};

        if (!ObjectId.isValid(shippingAddress.country)) return {amount: 0, breakdown: []};
        const countryId = await sellerCountryId(new ObjectId(shippingAddress.country), companyId, context.session);

        const zones = await taxZoneService.find({
            company: companyId,
            country: countryId,
            isActive: true,
        }, {withDeleted: false, session: context.session}, undefined, undefined, {priority: -1});

        if (zones.length === 0) return {amount: 0, breakdown: []};

        // Each rate is rounded once, on its own line, so the total is the sum of the lines shown (D35).
        const decimals = context.decimalPlaces ?? DEFAULT_DECIMAL_PLACES;
        let taxAmount = 0n;
        let runningBase = toMinor(subtotal, decimals);
        const breakdown: TaxBreakdownLine[] = [];
        const state = await resolveZoneState(countryId, shippingAddress.state, context.session);

        for (const zone of zones) {
            if (!zoneMatchesAddress(zone, state, shippingAddress.postalCode)) continue;

            const rates = (zone.rates as {name: string; rate: number; isCompound: boolean; appliesTo: string}[]) ?? [];
            for (const rate of rates) {
                if (!rateApplies(rate.appliesTo ?? "all", context.productType)) continue;

                const rateAmount = percentOfMinor(runningBase, rate.rate);
                taxAmount += rateAmount;
                breakdown.push({name: rate.name, rate: rate.rate, amount: minorToNumber(rateAmount, decimals)});
                if (rate.isCompound) runningBase += rateAmount;
            }
        }

        return {amount: minorToNumber(taxAmount, decimals), breakdown};
    },
};

const taxProviders: Record<string, TaxCalculatorProvider> = {
    internal: internalZonesTaxProvider,
};

/** External adapters call this at module load to become env-selectable. */
export function registerTaxProvider(provider: TaxCalculatorProvider): void {
    taxProviders[provider.name] = provider;
}

function activeTaxProvider(): TaxCalculatorProvider {
    return taxProviders[COMMERCE_PROVIDERS.TAX_PROVIDER] ?? internalZonesTaxProvider;
}

export async function calculateTax(
    subtotal: number,
    shippingAddress: ShippingAddress,
    companyId: ObjectId,
    context: TaxLineContext = {},
): Promise<TaxResult> {
    return activeTaxProvider().calculate(subtotal, shippingAddress, companyId, context);
}

/** Which rate scope a product type is taxed under; other types only take "all" rates. */
const TAX_PRODUCT_TYPE: Record<string, TaxLineContext["productType"]> = {
    physical: "physical",
    variable: "physical",
    bundle: "physical",
    digital: "digital",
};

/**
 * Tax for a set of priced lines: lines are grouped by rate scope (physical /
 * digital / rest) so type-specific rates apply, the order discount is spread
 * over the groups in proportion to their value, and the applied rates are
 * merged into one breakdown.
 */
export async function calculateLinesTax(
    lines: {product: unknown; totalPrice: number}[],
    discountTotal: number,
    shippingAddress: ShippingAddress,
    companyId: ObjectId,
    decimals: number = DEFAULT_DECIMAL_PLACES,
    session?: ClientSession,
): Promise<TaxResult> {
    const productIds = lines.map(line => nestedEntityToRef(line.product)?.toString() ?? "");
    const products = await productService.find({_id: {$in: productIds.filter(Boolean)}, company: companyId}, {session}, undefined, "type");
    const typeOf = new Map(products.map(product => [product._id.toString(), product.type]));

    const groups = new Map<TaxLineContext["productType"], bigint>();
    lines.forEach((line, idx) => {
        const scope = TAX_PRODUCT_TYPE[typeOf.get(productIds[idx]) ?? ""];
        groups.set(scope, (groups.get(scope) ?? 0n) + toMinor(line.totalPrice, decimals));
    });
    // The order discount is shared over the groups by value, in parts that add up to it exactly (D35).
    const values = [...groups.values()];
    const subtotal = sumMinor(values);
    const discount = toMinor(discountTotal, decimals);
    const discountShares = subtotal > 0n && discount > 0n ? allocateMinor(discount, values) : values.map(() => 0n);

    let amount = 0n;
    const merged = new Map<string, {line: TaxBreakdownLine; minor: bigint}>();
    let index = 0;
    for (const [productType, value] of groups) {
        const base = value - discountShares[index++];
        const result = await calculateTax(minorToNumber(base > 0n ? base : 0n, decimals), shippingAddress, companyId, {productType, decimalPlaces: decimals, session});
        amount += toMinor(result.amount, decimals);
        for (const line of result.breakdown) {
            const key = `${line.name}|${line.rate}`;
            const existing = merged.get(key);
            if (existing) existing.minor += toMinor(line.amount, decimals);
            else merged.set(key, {line: {...line}, minor: toMinor(line.amount, decimals)});
        }
    }

    return {
        amount: minorToNumber(amount, decimals),
        breakdown: [...merged.values()].map(({line, minor}) => ({...line, amount: minorToNumber(minor, decimals)})),
    };
}

/**
 * Tax contained in a tax-inclusive amount (till prices include VAT), using the
 * rates of the product type's scope at the given address. Compound rates are
 * folded in by pricing a base of 100 through the active provider.
 */
export async function calculateInclusiveTax(
    gross: number,
    productType: string | undefined,
    address: ShippingAddress,
    companyId: ObjectId,
    decimals: number = DEFAULT_DECIMAL_PLACES,
    session?: ClientSession,
): Promise<number> {
    // The tax on 100, at 2 places whatever the currency, is the effective percentage, compound rates included.
    const {amount} = await calculateTax(100, address, companyId, {productType: TAX_PRODUCT_TYPE[productType ?? ""], session});
    return amount > 0 ? minorToNumber(includedPercentOfMinor(toMinor(gross, decimals), amount), decimals) : 0;
}
