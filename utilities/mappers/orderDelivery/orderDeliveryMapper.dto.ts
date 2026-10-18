import { IOrderDelivery } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import { OrderDelivery } from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderDelivery/orderDelivery.dto";

import {mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapAttachment(a: any) {
    if (!a) return null;
    return {
        _id: a._id?.toString?.() || "",
        url: a.url,
        originalName: a.originalName,
    };
}

export function orderDeliveryToDTO(d: IOrderDelivery): OrderDelivery {
    const atts = Array.isArray(d.attachments) ? d.attachments : [];
    return {
        _id: d._id.toString(),
        orderId: d.order?._id?.toString?.() || (typeof d.order === "string" ? d.order : ""),
        message: d.message,
        attachments: atts.map(mapAttachment).filter(Boolean),
        status: d.status,
        ...mapLifeCycleToDTO(d),
    };
}

export function orderDeliveriesToDTO(items: IOrderDelivery[]): OrderDelivery[] {
    return items.map(orderDeliveryToDTO);
}
