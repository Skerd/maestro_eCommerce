import type {IReturnRequest} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function returnRequestToSelect(rr: IReturnRequest): ApiSelectDatum {
    return {
        value: rr._id.toString(),
        label: rr._id.toString(),
    };
}

export function returnRequestsToSelect(rrs: IReturnRequest[]): ApiSelectDatum[] {
    return rrs.map(returnRequestToSelect);
}
