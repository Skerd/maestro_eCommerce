import type {IFulfillment} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {Fulfillment} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function fulfillmentToDTO(fulfillment: IFulfillment): Fulfillment {
    return {
        _id: fulfillment._id.toString(),
        order: {_id: (fulfillment.order as any)?._id?.toString() ?? fulfillment.order?.toString() ?? "", orderNumber: (fulfillment.order as any)?.orderNumber},
        status: fulfillment.status,
        items: ((fulfillment.items as any[]) ?? []).map(i => ({
            orderItemId: i.orderItemId?.toString() ?? "",
            quantity: i.quantity,
        })),
        carrier: fulfillment.carrier,
        trackingNumber: fulfillment.trackingNumber,
        trackingUrl: fulfillment.trackingUrl,
        shippedAt: fulfillment.shippedAt?.toISOString(),
        estimatedDeliveryAt: fulfillment.estimatedDeliveryAt?.toISOString(),
        deliveredAt: fulfillment.deliveredAt?.toISOString(),
        notes: fulfillment.notes,
        ...mapSoftDeleteToDTO(fulfillment),
        ...mapOwnershipToDTO(fulfillment),
    };
}

export function fulfillmentsToDTO(fulfillments: IFulfillment[]): Fulfillment[] {
    return fulfillments.map(fulfillmentToDTO);
}
