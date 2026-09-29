import type {ITaxZone} from "@eCommerceModule/database/schemas/taxZone/taxZone";
import type {TaxZone} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.dto";
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

export function taxZoneToDTO(taxZone: ITaxZone): TaxZone {
    return {
        _id: taxZone._id.toString(),
        name: taxZone.name,
        country: mapSnippet<CountrySimple>()(taxZone.country, CountrySimpleSnippet)!,
        states: taxZone.states
            ?.map((s) => mapSnippet<StateSimple>()(s, StateSimpleSnippet))
            .filter((s): s is StateSimple => !!s),
        postalCodePatterns: taxZone.postalCodePatterns,
        rates: (taxZone.rates ?? []).map((r) => ({
            name: r.name,
            rate: r.rate,
            isCompound: r.isCompound ?? false,
            appliesTo: r.appliesTo,
        })),
        priority: taxZone.priority,
        isActive: taxZone.isActive,
        ...mapSoftDeleteToDTO(taxZone),
        ...mapOwnershipToDTO(taxZone),
        ...mapLifeCycleToDTO(taxZone),
    };
}

export function taxZonesToDTO(taxZones: ITaxZone[]): TaxZone[] {
    return taxZones.map(taxZoneToDTO);
}
