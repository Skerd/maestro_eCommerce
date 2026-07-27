import type {IShippingZone} from "@eCommerceModule/database/schemas/shippingZone/shippingZone";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function shippingZoneToSelect(zone: IShippingZone): ApiSelectDatum {
    return {
        value: zone._id.toString(),
        label: zone.name
    };
}

export function shippingZonesToSelect(zones: IShippingZone[]): ApiSelectDatum[] {
    return zones.map(shippingZoneToSelect);
}
