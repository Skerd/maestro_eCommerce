/**
 * Who may see and change marketplace records. Admins see and manage everything
 * in the company. Everyone else sees only the orders they are a party to (and
 * the deliveries, milestones, revisions, bookings and disputes hanging off
 * them), and changes only the listings, packages, add-ons, task requests,
 * promotions and bids they own.
 */

import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {taskRequestService} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.service";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import type {UserContext} from "@coreModule/utilities/types/types";
import type {IOrder} from "@eCommerceModule/database/schemas/order/order";

/** The two facts every rule below needs; the API passes its UserContext, the assistant its access decision. */
type Caller = Pick<UserContext, "userId" | "isAdmin">;

/** Throws unless the caller is an admin or the user `ownerRef` points at. */
export function assertOwnerOrAdmin(ownerRef: unknown, actionUserCtx: Caller, languageCode: string): void {
    if (actionUserCtx.isAdmin) return;
    if (nestedEntityToRef(ownerRef)?.toString() !== actionUserCtx.userId) {
        throw apiValidationException("user_permissions_not_sufficient", null, null, languageCode);
    }
}

/** Order filter limiting a non-admin to the orders they are a party to. */
export function orderPartyFilter(actionUserCtx: Caller): Record<string, unknown> {
    if (actionUserCtx.isAdmin) return {};
    const userId = new ObjectId(actionUserCtx.userId);
    return {$or: [{customer: userId}, {provider: userId}]};
}

export function isOrderParty(order: IOrder, userId: string, role: "customer" | "provider"): boolean {
    return nestedEntityToRef(order[role])?.toString() === userId;
}

/** Filter for records with an `order` ref: non-admins see only those of their own orders. */
export async function orderChildFilter(
    companyId: ObjectId,
    actionUserCtx: Caller,
    opts: CrudOptions,
): Promise<Record<string, unknown>> {
    if (actionUserCtx.isAdmin) return {};
    const orders = await orderService.find({company: companyId, ...orderPartyFilter(actionUserCtx)}, opts, null, "_id");
    return {order: {$in: orders.map((order) => order._id)}};
}

/**
 * Bids are private to the bidder and the task requester: a non-admin sees their
 * own bids and the bids on their own task requests, never a competitor's.
 */
export async function bidVisibilityFilter(
    companyId: ObjectId,
    actionUserCtx: Caller,
    opts: CrudOptions,
): Promise<Record<string, unknown>> {
    if (actionUserCtx.isAdmin) return {};
    const userId = new ObjectId(actionUserCtx.userId);
    const myTaskRequests = await taskRequestService.find({company: companyId, requester: userId}, opts, null, "_id");
    return {$or: [{bidder: userId}, {taskRequest: {$in: myTaskRequests.map((taskRequest) => taskRequest._id)}}]};
}
