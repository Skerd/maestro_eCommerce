import type {IShippingZone} from "@eCommerceModule/database/schemas/shippingZone/shippingZone";
import type {ShippingZone} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.dto";
import {mapPopulatedRef} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function shippingZoneToDTO(zone: IShippingZone): ShippingZone {
    return {
        _id: zone._id.toString(),
        name: zone.name,
        countries: zone.countries?.map((c) => mapPopulatedRef(c)) ?? undefined,
        states: zone.states?.map((s) => mapPopulatedRef(s)) ?? undefined,
        postalCodePatterns: zone.postalCodePatterns,
        rates: (zone.rates ?? []).map((r) => ({
            name: r.name,
            type: r.type,
            price: r.price,
            carrier: r.carrier,
            estimatedDeliveryDays: r.estimatedDeliveryDays,
            conditions: r.conditions,
        })),
        isActive: zone.isActive,
        company: mapPopulatedRef(zone.company),
        ...mapSoftDeleteToDTO(zone),
        ...mapOwnershipToDTO(zone),
        ...mapLifeCycleToDTO(zone),
    };
}

export function shippingZonesToDTO(zones: IShippingZone[]): ShippingZone[] {
    return zones.map(shippingZoneToDTO);
}
