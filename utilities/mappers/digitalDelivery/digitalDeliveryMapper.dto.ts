import type {IDigitalDelivery} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import type {DigitalDelivery} from "armonia/src/modules/eCommerce/api/eCommerce/private/digitalDelivery/digitalDelivery.dto";
import {dateToISOString, objectIdToString} from "@coreModule/utilities/mappers/common.mapper";

export function digitalDeliveryToDTO(delivery: IDigitalDelivery): DigitalDelivery {
    const product = delivery.product as any;
    return {
        _id: delivery._id.toString(),
        order: objectIdToString((delivery.order as any)?._id ?? delivery.order),
        product:
            product && typeof product === "object" && product._id
                ? {_id: product._id.toString(), title: product.title, slug: product.slug}
                : undefined,
        token: delivery.token,
        files: (delivery.media ?? []).map((media: any) => ({
            _id: objectIdToString(media?._id ?? media),
            fileName: media?.fileName,
        })),
        downloadLimit: delivery.downloadLimit,
        downloadCount: delivery.downloadCount ?? 0,
        remainingDownloads: Math.max(0, delivery.downloadLimit - (delivery.downloadCount ?? 0)),
        expiresAt: dateToISOString(delivery.expiresAt) || undefined,
    };
}

export function digitalDeliveriesToDTO(deliveries: IDigitalDelivery[]): DigitalDelivery[] {
    return deliveries.map(digitalDeliveryToDTO);
}
