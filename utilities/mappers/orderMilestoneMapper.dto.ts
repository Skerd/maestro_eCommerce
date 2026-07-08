import { IOrderMilestone } from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import { OrderMilestone } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/orderMilestone.form.response.type";

export function orderMilestoneToDTO(m: IOrderMilestone | any): OrderMilestone {
    const currency = m.currency;
    return {
        _id: m._id.toString(),
        orderId: m.order?._id?.toString?.() || (typeof m.order === "string" ? m.order : ""),
        name: m.name,
        amount: typeof m.amount === "number" ? m.amount : parseFloat(String(m.amount || 0)),
        currencyId: currency?._id?.toString?.() || (typeof m.currency === "string" ? m.currency : ""),
        currencySymbol: currency?.symbol,
        status: m.status,
        orderIndex: m.orderIndex ?? 0,
    };
}

export function orderMilestonesToDTO(items: IOrderMilestone[]): OrderMilestone[] {
    return items.map(orderMilestoneToDTO);
}
