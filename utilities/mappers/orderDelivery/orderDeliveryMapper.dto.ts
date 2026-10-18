import type {IOrderDelivery} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import type {OrderDelivery} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderDelivery/orderDelivery.dto";
import type {OrderSimple} from "armonia/src/modules/eCommerce/dto/order.dto";
import {OrderSimpleSnippet} from "@eCommerceModule/database/schemas/order/order.snippets";
import {mapMedia, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function orderDeliveryToDTO(delivery: IOrderDelivery): OrderDelivery {
    return {
        _id: delivery._id.toString(),
        order: mapSnippet<OrderSimple>()(delivery.order, OrderSimpleSnippet),
        message: delivery.message,
        attachments: delivery.attachments.map(mapMedia),
        status: delivery.status,
        ...mapOwnershipToDTO(delivery),
        ...mapSoftDeleteToDTO(delivery),
        ...mapLifeCycleToDTO(delivery),
    };
}

export function orderDeliveriesToDTO(deliveries: IOrderDelivery[]): OrderDelivery[] {
    return deliveries.map(orderDeliveryToDTO);
}
