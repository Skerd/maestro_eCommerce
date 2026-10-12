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

/** One option per order line (`_id` of the line), e.g. "Mug (Red / XL) × 2". */
export function productOrderLinesToSelect(order: IProductOrder): ApiSelectDatum[] {
    return order.items.map(item => {
        const variant = item.snapshot?.variantLabel ? ` (${item.snapshot.variantLabel})` : "";
        return {value: item._id.toString(), label: `${item.snapshot?.title ?? ""}${variant} × ${item.quantity}`};
    });
}
