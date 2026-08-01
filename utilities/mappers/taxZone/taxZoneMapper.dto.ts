import type {ITaxZone} from "@eCommerceModule/database/schemas/taxZone/taxZone";
import type {TaxZone} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.dto";
import {mapPopulatedRef} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function taxZoneToDTO(taxZone: ITaxZone): TaxZone {
    return {
        _id: taxZone._id.toString(),
        name: taxZone.name,
        country: mapPopulatedRef(taxZone.country),
        states: taxZone.states?.map((s) => mapPopulatedRef(s)) ?? undefined,
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
