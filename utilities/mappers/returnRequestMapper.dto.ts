import type {IReturnRequest} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import type {ReturnRequest} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function returnRequestToDTO(rr: IReturnRequest): ReturnRequest {
    return {
        _id: rr._id.toString(),
        order: {_id: (rr.order as any)?._id?.toString() ?? rr.order?.toString() ?? "", orderNumber: (rr.order as any)?.orderNumber ?? ""},
        type: rr.type,
        status: rr.status,
        items: ((rr.items as any[]) ?? []).map(i => ({
            orderItemId: i.orderItemId?.toString() ?? "",
            quantity: i.quantity,
            reason: i.reason,
        })),
        refundAmount: rr.refundAmount,
        customerNote: rr.customerNote,
        adminNote: rr.adminNote,
        resolvedBy: rr.resolvedBy ? {_id: (rr.resolvedBy as any)?._id?.toString() ?? rr.resolvedBy?.toString() ?? "", name: (rr.resolvedBy as any)?.name ?? ""} : undefined,
        resolvedAt: rr.resolvedAt?.toISOString(),
        ...mapSoftDeleteToDTO(rr),
        ...mapOwnershipToDTO(rr),
    };
}

export function returnRequestsToDTO(rrs: IReturnRequest[]): ReturnRequest[] {
    return rrs.map(returnRequestToDTO);
}
