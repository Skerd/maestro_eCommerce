import {ObjectId} from "mongodb";
import {COMMERCE_PROVIDERS} from "@coreModule/environment";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";

export type ShippingAddress = {
    country?: string;
    state?: string;
    postalCode?: string;
};

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
    ): Promise<number>;
}

function matchesPostalCode(postalCode: string | undefined, patterns: string[] | undefined): boolean {
    if (!patterns?.length) return true;
    if (!postalCode) return false;
    return patterns.some((pattern) => {
        const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`, "i");
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
        if (!shippingAddress.country) return 0;

        let countryId: ObjectId;
        try {
            countryId = new ObjectId(shippingAddress.country);
        } catch {
            return 0;
        }

        const zones = await TaxZone.find({
            company: companyId,
            country: countryId,
            isActive: true,
        }).sort({priority: -1}).lean();

        if (zones.length === 0) return 0;

        let taxAmount = 0;
        let runningBase = subtotal;

        for (const zone of zones) {
            if (!zoneMatchesAddress(zone, shippingAddress.state, shippingAddress.postalCode)) continue;

            const rates = (zone.rates as {name: string; rate: number; isCompound: boolean; appliesTo: string}[]) ?? [];
            for (const rate of rates) {
                if (!rateApplies(rate.appliesTo ?? "all", context.productType)) continue;

                const rateAmount = (runningBase * rate.rate) / 100;
                taxAmount += rateAmount;
                if (rate.isCompound) runningBase += rateAmount;
            }
        }

        return Math.round(taxAmount * 100) / 100;
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
): Promise<number> {
    return activeTaxProvider().calculate(subtotal, shippingAddress, companyId, context);
}
