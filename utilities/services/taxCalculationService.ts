import {ObjectId} from "mongodb";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {COMMERCE_PROVIDERS} from "@eCommerceModule/environment";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import Product from "@eCommerceModule/database/schemas/product/product";
import {roundMoney} from "@eCommerceModule/utilities/services/money";
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
};

/**
 * Provider seam (§2.C): `calculateTax` stays the single call-site facade;
 * external calculators (Avalara, TaxJar, …) implement this interface and
 * register under their env-selectable name. InternalZones is the default.
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

        let countryId: ObjectId;
        try {
            countryId = new ObjectId(shippingAddress.country);
        } catch {
            return {amount: 0, breakdown: []};
        }

        const zones = await TaxZone.find({
            company: companyId,
            country: countryId,
            isActive: true,
        }).noDeleted().sort({priority: -1}).lean();

        if (zones.length === 0) return {amount: 0, breakdown: []};

        let taxAmount = 0;
        let runningBase = subtotal;
        const breakdown: TaxBreakdownLine[] = [];

        for (const zone of zones) {
            if (!zoneMatchesAddress(zone, shippingAddress.state, shippingAddress.postalCode)) continue;

            const rates = (zone.rates as {name: string; rate: number; isCompound: boolean; appliesTo: string}[]) ?? [];
            for (const rate of rates) {
                if (!rateApplies(rate.appliesTo ?? "all", context.productType)) continue;

                const rateAmount = (runningBase * rate.rate) / 100;
                taxAmount += rateAmount;
                breakdown.push({name: rate.name, rate: rate.rate, amount: rateAmount});
                if (rate.isCompound) runningBase += rateAmount;
            }
        }

        return {amount: roundMoney(taxAmount), breakdown};
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
): Promise<TaxResult> {
    const productIds = lines.map(line => nestedEntityToRef(line.product)?.toString() ?? "");
    const products = await Product.find({_id: {$in: productIds.filter(Boolean)}, company: companyId}, {type: 1}).lean();
    const typeOf = new Map(products.map(product => [product._id.toString(), product.type]));

    const groups = new Map<TaxLineContext["productType"], number>();
    lines.forEach((line, idx) => {
        const scope = TAX_PRODUCT_TYPE[typeOf.get(productIds[idx]) ?? ""];
        groups.set(scope, (groups.get(scope) ?? 0) + line.totalPrice);
    });
    const subtotal = [...groups.values()].reduce((sum, value) => sum + value, 0);

    let amount = 0;
    const merged = new Map<string, TaxBreakdownLine>();
    for (const [productType, value] of groups) {
        const share = subtotal > 0 ? value / subtotal : 0;
        const base = Math.max(0, value - discountTotal * share);
        const result = await calculateTax(base, shippingAddress, companyId, {productType});
        amount += result.amount;
        for (const line of result.breakdown) {
            const key = `${line.name}|${line.rate}`;
            const existing = merged.get(key);
            if (existing) existing.amount += line.amount;
            else merged.set(key, {...line});
        }
    }

    return {
        amount: roundMoney(amount),
        breakdown: [...merged.values()].map(line => ({...line, amount: roundMoney(line.amount)})),
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
): Promise<number> {
    const {amount} = await calculateTax(100, address, companyId, {productType: TAX_PRODUCT_TYPE[productType ?? ""]});
    const rate = amount / 100;
    return rate > 0 ? roundMoney(gross - gross / (1 + rate)) : 0;
}
