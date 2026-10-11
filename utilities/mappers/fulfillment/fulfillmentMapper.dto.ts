import type {IFulfillment} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {Fulfillment} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.dto";
import type {ProductOrderSimple} from "armonia/src/modules/eCommerce/dto/productOrder.dto";
import {dateToISOString, mapSnippet, objectIdToString} from "@coreModule/utilities/mappers/common.mapper";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function fulfillmentToDTO(fulfillment: IFulfillment): Fulfillment {
    return {
        _id: fulfillment._id.toString(),
        order: mapSnippet<ProductOrderSimple>()(fulfillment.order, ProductOrderSimpleSnippet)!,
        status: fulfillment.status,
        items: fulfillment.items.map((i) => ({
            orderItemId: objectIdToString(i.orderItemId),
            quantity: i.quantity,
        })),
        carrier: fulfillment.carrier,
        trackingNumber: fulfillment.trackingNumber,
        trackingUrl: fulfillment.trackingUrl,
        shippedAt: dateToISOString(fulfillment.shippedAt) || undefined,
        estimatedDeliveryAt: dateToISOString(fulfillment.estimatedDeliveryAt) || undefined,
        deliveredAt: dateToISOString(fulfillment.deliveredAt) || undefined,
        notes: fulfillment.notes,
        ...mapSoftDeleteToDTO(fulfillment),
        ...mapOwnershipToDTO(fulfillment),
        ...mapLifeCycleToDTO(fulfillment),
    };
}

export function fulfillmentsToDTO(fulfillments: IFulfillment[]): Fulfillment[] {
    return fulfillments.map(fulfillmentToDTO);
}
