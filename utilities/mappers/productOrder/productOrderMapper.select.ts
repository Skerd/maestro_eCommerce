import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function productOrderToSelect(order: IProductOrder): ApiSelectDatum {
    return {
        value: order._id.toString(),
        label: order.orderNumber,
    };
}

export function productOrdersToSelect(orders: IProductOrder[]): ApiSelectDatum[] {
    return orders.map(productOrderToSelect);
}
