import type {IReturnRequest} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import type {ReturnRequest} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {ProductOrderSimple} from "armonia/src/modules/eCommerce/dto/productOrder.dto";
import {dateToISOString, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function returnRequestToDTO(rr: IReturnRequest): ReturnRequest {
    return {
        _id: rr._id.toString(),
        order: mapSnippet<ProductOrderSimple>()(rr.order, ProductOrderSimpleSnippet)!,
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
        resolvedBy: mapSnippet<SimpleBlankUser>()(rr.resolvedBy, SimpleBlankUserSnippet),
        resolvedAt: dateToISOString(rr.resolvedAt) || undefined,
        ...mapSoftDeleteToDTO(rr),
        ...mapOwnershipToDTO(rr),
        ...mapLifeCycleToDTO(rr),
    };
}

export function returnRequestsToDTO(rrs: IReturnRequest[]): ReturnRequest[] {
    return rrs.map(returnRequestToDTO);
}
