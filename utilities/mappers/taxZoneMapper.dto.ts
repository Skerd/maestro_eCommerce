import type {ITaxZone} from "@eCommerceModule/database/schemas/taxZone/taxZone";
import type {TaxZone} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapPopulatedRef(ref: any): {_id: string; name: string} {
    return {_id: ref?._id?.toString() ?? ref?.toString() ?? "", name: ref?.name ?? ""};
}

export function taxZoneToDTO(taxZone: ITaxZone): TaxZone {
    return {
        _id: taxZone._id.toString(),
        name: taxZone.name,
        country: mapPopulatedRef(taxZone.country),
        states: (taxZone.states as any[])?.map(mapPopulatedRef),
        postalCodePatterns: taxZone.postalCodePatterns,
        rates: (taxZone.rates ?? []).map(r => ({
            name: r.name,
            rate: r.rate,
            isCompound: r.isCompound ?? false,
            appliesTo: r.appliesTo,
        })),
        priority: taxZone.priority,
        isActive: taxZone.isActive,
        company: taxZone.company ? {_id: taxZone.company._id.toString(), name: taxZone.company.name} : undefined,
        ...mapSoftDeleteToDTO(taxZone),
        ...mapOwnershipToDTO(taxZone),
    };
}

export function taxZonesToDTO(taxZones: ITaxZone[]): TaxZone[] {
    return taxZones.map(taxZoneToDTO);
}

export function taxZoneToSelect(taxZone: ITaxZone): ApiSelectDatum {
    return {value: taxZone._id.toString(), label: taxZone.name};
}

export function taxZonesToSelect(taxZones: ITaxZone[]): ApiSelectDatum[] {
    return taxZones.map(taxZoneToSelect);
}
