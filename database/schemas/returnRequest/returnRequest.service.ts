import type {ObjectId} from "mongodb";
import {BaseCrudService, type CrudOptions} from "@coreModule/database/services/baseCrudService";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import ReturnRequest, {IReturnRequest} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {roundMoney} from "@coreModule/utilities/helpers/money";

type ReturnItem = {orderItemId: unknown; quantity: number};

export class ReturnRequestService extends BaseCrudService<IReturnRequest, typeof ReturnRequest> {
    constructor() {
        super(ReturnRequest, "ReturnRequest");
    }

    /**
     * Quantity per order line (keyed by line `_id`) that can still be returned:
     * what shipped or was delivered, minus what other open or completed
     * (not rejected) return requests already claim.
     */
    async returnableQuantities(order: IProductOrder, opts: CrudOptions, excludeId?: ObjectId): Promise<Map<string, number>> {
        const company = nestedEntityToRef(order.company);
        const [fulfillments, returns] = await Promise.all([
            Fulfillment.find({order: order._id, company, status: {$in: ["shipped", "delivered"]}})
                .noDeleted().session(opts.session ?? null).lean(),
            ReturnRequest.find({order: order._id, company, status: {$ne: "rejected"}, ...(excludeId ? {_id: {$ne: excludeId}} : {})})
                .noDeleted().session(opts.session ?? null).lean(),
        ]);

        const returnable = new Map<string, number>();
        const add = (items: ReturnItem[], sign: number) => {
            for (const item of items) {
                const key = String(nestedEntityToRef(item.orderItemId));
                returnable.set(key, (returnable.get(key) ?? 0) + sign * item.quantity);
            }
        };
        fulfillments.forEach(fulfillment => add(fulfillment.items, 1));
        returns.forEach(request => add(request.items, -1));
        return returnable;
    }
}

/** What the returned items were sold for — the most a return can refund. */
export function returnedItemsValue(order: IProductOrder, items: ReturnItem[]): number {
    return roundMoney(items.reduce((sum, item) => {
        const line = order.items.find(orderLine => orderLine._id.toString() === String(nestedEntityToRef(item.orderItemId)));
        return line && line.quantity > 0 ? sum + (line.totalPrice / line.quantity) * item.quantity : sum;
    }, 0));
}

export const returnRequestService = new ReturnRequestService();
