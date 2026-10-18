import type {IOrderRevision} from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import type {OrderRevision} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderRevision/orderRevision.dto";
import type {OrderSimple} from "armonia/src/modules/eCommerce/dto/order.dto";
import type {OrderDeliverySimple} from "armonia/src/modules/eCommerce/dto/orderDelivery.dto";
import type {SimpleUser} from "armonia/src/modules/core/dto/user.dto";
import {OrderSimpleSnippet} from "@eCommerceModule/database/schemas/order/order.snippets";
import {OrderDeliverySimpleSnippet} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function orderRevisionToDTO(revision: IOrderRevision): OrderRevision {
    return {
        _id: revision._id.toString(),
        order: mapSnippet<OrderSimple>()(revision.order, OrderSimpleSnippet),
        delivery: mapSnippet<OrderDeliverySimple>()(revision.delivery, OrderDeliverySimpleSnippet),
        requestedBy: mapSnippet<SimpleUser>()(revision.requestedBy, SimpleUserSnippet),
        reason: revision.reason,
        status: revision.status,
        ...mapOwnershipToDTO(revision),
        ...mapSoftDeleteToDTO(revision),
        ...mapLifeCycleToDTO(revision),
    };
}

export function orderRevisionsToDTO(revisions: IOrderRevision[]): OrderRevision[] {
    return revisions.map(orderRevisionToDTO);
}
