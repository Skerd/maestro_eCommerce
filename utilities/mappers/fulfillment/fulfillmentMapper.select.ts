import type {IFulfillment} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function fulfillmentToSelect(fulfillment: IFulfillment): ApiSelectDatum {
    return {
        value: fulfillment._id.toString(),
        label: fulfillment.trackingNumber ?? fulfillment._id.toString(),
    };
}

export function fulfillmentsToSelect(fulfillments: IFulfillment[]): ApiSelectDatum[] {
    return fulfillments.map(fulfillmentToSelect);
}
