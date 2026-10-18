import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {IOrder} from "@eCommerceModule/database/schemas/order/order";

export function orderToSelect(order: IOrder | any): ApiSelectDatum {
    const title = [order.name, order.listing?.title, order.taskRequest?.title].filter(Boolean).join(" - ") || order.name || "";
    return {
        value: order._id.toString(),
        label: title,
    };
}

export function ordersToSelect(orders: (IOrder | any)[]): ApiSelectDatum[] {
    return orders.map(orderToSelect);
}
