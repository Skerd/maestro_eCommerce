import {ObjectId} from "mongodb";
import {COMMERCE_PROVIDERS} from "@eCommerceModule/environment";
import ShippingZone, {IShippingZone} from "@eCommerceModule/database/schemas/shippingZone/shippingZone";

export type CartForShipping = {
    subtotal: number;
    totalWeight?: number;
    itemCount: number;
    destinationCountry?: string;
    destinationState?: string;
    destinationPostalCode?: string;
};

export type AvailableShippingRate = {
    zoneId: string;
    zoneName: string;
    rateName: string;
    rateType: string;
    price: number;
    estimatedDays?: number;
};

type ShippingZoneRate = IShippingZone["rates"][number];

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
    destinationState?: string,
    destinationPostalCode?: string,
): boolean {
    const states = (zone.states ?? []) as {toString(): string}[];
    if (states.length > 0) {
        if (!destinationState) return false;
        if (!states.some((s) => s.toString() === destinationState)) return false;
    }
    return matchesPostalCode(destinationPostalCode, zone.postalCodePatterns);
}

function computeRatePrice(rate: ShippingZoneRate, cart: CartForShipping): number | null {
    const conditions = rate.conditions ?? {};

    if (rate.type === "free") return 0;

    if (rate.type === "flat") return rate.price ?? 0;

    if (rate.type === "weight") {
        const weight = cart.totalWeight ?? 0;
        if (conditions.minWeight != null && weight < conditions.minWeight) return null;
        if (conditions.maxWeight != null && weight > conditions.maxWeight) return null;
        return rate.price ?? 0;
    }

    if (rate.type === "price") {
        if (conditions.minOrderAmount != null && cart.subtotal < conditions.minOrderAmount) return null;
        if (conditions.maxOrderAmount != null && cart.subtotal > conditions.maxOrderAmount) return null;
        return rate.price ?? 0;
    }

    if (rate.type === "quantity") {
        if (conditions.minOrderAmount != null && cart.itemCount < conditions.minOrderAmount) return null;
        if (conditions.maxOrderAmount != null && cart.itemCount > conditions.maxOrderAmount) return null;
        return rate.price ?? 0;
    }

    return rate.price ?? 0;
}

/**
 * Provider seam (§2.C): `calculateShipping` stays the single call-site facade;
 * external rate providers (EasyPost, Shippo, …) implement this interface and
 * register under their env-selectable name. InternalZones is the default.
 */
export interface ShippingRateProvider {
    readonly name: string;
    getRates(cart: CartForShipping, companyId: ObjectId): Promise<AvailableShippingRate[]>;
}

const internalZonesShippingProvider: ShippingRateProvider = {
    name: "internal",
    async getRates(cart, companyId) {
        if (!cart.destinationCountry) return [];

        let countryId: ObjectId;
        try {
            countryId = new ObjectId(cart.destinationCountry);
        } catch {
            return [];
        }

        const zones = await ShippingZone.find({
            company: companyId,
            isActive: true,
            countries: countryId,
        }).lean();

        const availableRates: AvailableShippingRate[] = [];

        for (const zone of zones) {
            if (!zoneMatchesAddress(zone, cart.destinationState, cart.destinationPostalCode)) continue;

            const rates: ShippingZoneRate[] = zone.rates ?? [];
            for (const rate of rates) {
                const price = computeRatePrice(rate, cart);
                if (price === null) continue;

                availableRates.push({
                    zoneId: zone._id.toString(),
                    zoneName: zone.name,
                    rateName: rate.name,
                    rateType: rate.type,
                    price,
                    estimatedDays: rate.estimatedDeliveryDays,
                });
            }
        }

        return availableRates;
    },
};

const shippingProviders: Record<string, ShippingRateProvider> = {
    internal: internalZonesShippingProvider,
};

/** External adapters call this at module load to become env-selectable. */
export function registerShippingProvider(provider: ShippingRateProvider): void {
    shippingProviders[provider.name] = provider;
}

function activeShippingProvider(): ShippingRateProvider {
    return shippingProviders[COMMERCE_PROVIDERS.SHIPPING_PROVIDER] ?? internalZonesShippingProvider;
}

export async function calculateShipping(
    cart: CartForShipping,
    companyId: ObjectId,
): Promise<AvailableShippingRate[]> {
    return activeShippingProvider().getRates(cart, companyId);
}
