import type {IFulfillment} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {Fulfillment} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function toIso(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    const d = new Date(value as any);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function fulfillmentToDTO(fulfillment: IFulfillment): Fulfillment {
    return {
        _id: fulfillment._id.toString(),
        order: {
            _id: (fulfillment.order as any)?._id?.toString() ?? fulfillment.order?.toString() ?? "",
            orderNumber: (fulfillment.order as any)?.orderNumber,
        },
        status: fulfillment.status,
        items: ((fulfillment.items as any[]) ?? []).map((i) => ({
            orderItemId: i.orderItemId?.toString() ?? "",
            quantity: i.quantity,
        })),
        carrier: fulfillment.carrier,
        trackingNumber: fulfillment.trackingNumber,
        trackingUrl: fulfillment.trackingUrl,
        shippedAt: toIso(fulfillment.shippedAt),
        estimatedDeliveryAt: toIso(fulfillment.estimatedDeliveryAt),
        deliveredAt: toIso(fulfillment.deliveredAt),
        notes: fulfillment.notes,
        company: fulfillment.company
            ? {
                  _id: (fulfillment.company as any)?._id?.toString?.() ?? fulfillment.company.toString(),
                  name: (fulfillment.company as any)?.name ?? "",
              }
            : undefined,
        createdAt: toIso((fulfillment as any).createdAt),
        updatedAt: toIso((fulfillment as any).updatedAt),
        ...mapSoftDeleteToDTO(fulfillment),
        ...mapOwnershipToDTO(fulfillment),
    };
}

export function fulfillmentsToDTO(fulfillments: IFulfillment[]): Fulfillment[] {
    return fulfillments.map(fulfillmentToDTO);
}
