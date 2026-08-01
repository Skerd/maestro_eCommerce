import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function posOrderToSelect(order: IPosOrder): ApiSelectDatum {
    return {
        value: order._id.toString(),
        label: order.name,
    };
}

export function posOrdersToSelect(orders: IPosOrder[]): ApiSelectDatum[] {
    return orders.map(posOrderToSelect);
}
