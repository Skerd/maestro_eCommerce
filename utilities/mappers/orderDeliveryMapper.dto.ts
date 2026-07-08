import { IOrderDelivery } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import { OrderDelivery } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/orderDelivery.form.response.type";

function mapAttachment(a: any) {
    if (!a) return null;
    return {
        _id: a._id?.toString?.() || "",
        url: a.url,
        originalName: a.originalName,
    };
}

export function orderDeliveryToDTO(d: IOrderDelivery | any): OrderDelivery {
    const atts = Array.isArray(d.attachments) ? d.attachments : [];
    return {
        _id: d._id.toString(),
        orderId: d.order?._id?.toString?.() || (typeof d.order === "string" ? d.order : ""),
        message: d.message,
        attachments: atts.map(mapAttachment).filter(Boolean),
        status: d.status,
    };
}

export function orderDeliveriesToDTO(items: IOrderDelivery[]): OrderDelivery[] {
    return items.map(orderDeliveryToDTO);
}
