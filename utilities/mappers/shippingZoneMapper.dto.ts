import type {IShippingZone} from "@eCommerceModule/database/schemas/shippingZone/shippingZone";
import type {ShippingZone} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapPopulatedCountry(ref: any): {_id: string; name: string} {
    return {_id: ref?._id?.toString() ?? ref?.toString() ?? "", name: ref?.name ?? ""};
}

export function shippingZoneToDTO(zone: IShippingZone): ShippingZone {
    return {
        _id: zone._id.toString(),
        name: zone.name,
        countries: (zone.countries as any[])?.map(mapPopulatedCountry) ?? [],
        states: (zone.states as any[])?.map(mapPopulatedCountry),
        postalCodePatterns: zone.postalCodePatterns,
        rates: (zone.rates ?? []).map(r => ({
            name: r.name,
            type: r.type,
            price: r.price,
            carrier: r.carrier,
            estimatedDeliveryDays: r.estimatedDeliveryDays,
            conditions: r.conditions,
        })),
        isActive: zone.isActive,
        company: zone.company ? {_id: zone.company._id.toString(), name: zone.company.name} : undefined,
        ...mapSoftDeleteToDTO(zone),
        ...mapOwnershipToDTO(zone),
    };
}

export function shippingZonesToDTO(zones: IShippingZone[]): ShippingZone[] {
    return zones.map(shippingZoneToDTO);
}

export function shippingZoneToSelect(zone: IShippingZone): ApiSelectDatum {
    return {value: zone._id.toString(), label: zone.name};
}

export function shippingZonesToSelect(zones: IShippingZone[]): ApiSelectDatum[] {
    return zones.map(shippingZoneToSelect);
}
