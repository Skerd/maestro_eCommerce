import type {ITaxZone} from "@eCommerceModule/database/schemas/taxZone/taxZone";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function taxZoneToSelect(taxZone: ITaxZone): ApiSelectDatum {
    return {
        value: taxZone._id.toString(),
        label: taxZone.name
    };
}

export function taxZonesToSelect(taxZones: ITaxZone[]): ApiSelectDatum[] {
    return taxZones.map(taxZoneToSelect);
}
