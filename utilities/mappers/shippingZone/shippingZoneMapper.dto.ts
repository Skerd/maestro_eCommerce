import type {IShippingZone} from "@eCommerceModule/database/schemas/shippingZone/shippingZone";
import type {ShippingZone} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.dto";
import type {CountrySimple} from "armonia/src/modules/core/dto/country.dto";
import type {StateSimple} from "armonia/src/modules/core/dto/state.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function shippingZoneToDTO(zone: IShippingZone): ShippingZone {
    return {
        _id: zone._id.toString(),
        name: zone.name,
        countries: zone.countries
            ?.map((c) => mapSnippet<CountrySimple>()(c, CountrySimpleSnippet))
            .filter((c): c is CountrySimple => !!c),
        states: zone.states
            ?.map((s) => mapSnippet<StateSimple>()(s, StateSimpleSnippet))
            .filter((s): s is StateSimple => !!s),
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
        ...mapSoftDeleteToDTO(zone),
        ...mapOwnershipToDTO(zone),
        ...mapLifeCycleToDTO(zone),
    };
}

export function shippingZonesToDTO(zones: IShippingZone[]): ShippingZone[] {
    return zones.map(shippingZoneToDTO);
}
