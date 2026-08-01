import type {IReturnRequest} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import type {ReturnRequest} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.dto";
import {
    dateToISOString,
    mapPopulatedSimpleUser,
} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function returnRequestToDTO(rr: IReturnRequest): ReturnRequest {
    return {
        _id: rr._id.toString(),
        order: {
            _id: rr.order._id.toString(),
            orderNumber: rr.order.orderNumber ?? "",
        },
        type: rr.type,
        status: rr.status,
        items: (rr.items ?? []).map((i) => ({
            orderItemId: i.orderItemId?.toString(),
            quantity: i.quantity,
            reason: i.reason,
        })),
        refundAmount: rr.refundAmount,
        customerNote: rr.customerNote,
        adminNote: rr.adminNote,
        resolvedBy: mapPopulatedSimpleUser(rr.resolvedBy),
        resolvedAt: dateToISOString(rr.resolvedAt) || undefined,
        ...mapSoftDeleteToDTO(rr),
        ...mapOwnershipToDTO(rr),
        ...mapLifeCycleToDTO(rr),
    };
}

export function returnRequestsToDTO(rrs: IReturnRequest[]): ReturnRequest[] {
    return rrs.map(returnRequestToDTO);
}
