import type {IOrderRevision} from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import type {OrderRevision} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderRevision/orderRevision.dto";

import {mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function refId(ref: unknown): string {
    if (!ref) return "";
    const r = ref as {_id?: {toString?: () => string}; toString?: () => string};
    return r._id?.toString?.() ?? r.toString?.() ?? "";
}

export function orderRevisionToDTO(r: IOrderRevision): OrderRevision {
    return {
        _id: r._id.toString(),
        orderId: refId(r.order),
        deliveryId: refId(r.delivery),
        requestedById: refId(r.requestedBy),
        reason: r.reason,
        status: r.status,
        ...mapLifeCycleToDTO(r),
    };
}

export function orderRevisionsToDTO(items: (IOrderRevision)[]): OrderRevision[] {
    return items.map(orderRevisionToDTO);
}
