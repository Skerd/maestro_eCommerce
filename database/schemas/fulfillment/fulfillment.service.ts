import {BaseCrudService, type CrudOptions} from "@coreModule/database/services/baseCrudService";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import Fulfillment, {IFulfillment} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";

export class FulfillmentService extends BaseCrudService<IFulfillment, typeof Fulfillment> {
    constructor() {
        super(Fulfillment, "Fulfillment");
    }

    /**
     * Quantity per order line (keyed by line `_id`) not yet covered by a
     * pending, shipped or delivered fulfillment. Failed fulfillments free their lines again.
     */
    async remainingQuantities(order: IProductOrder, opts: CrudOptions): Promise<Map<string, number>> {
        const fulfillments = await this.find(
            {order: order._id, company: nestedEntityToRef(order.company), status: {$ne: "failed"}},
            {...opts, withDeleted: false},
        );

        const remaining = new Map(order.items.map(item => [item._id.toString(), item.quantity]));
        for (const fulfillment of fulfillments) {
            for (const item of fulfillment.items) {
                const key = item.orderItemId.toString();
                remaining.set(key, (remaining.get(key) ?? 0) - item.quantity);
            }
        }
        return remaining;
    }
}

export const fulfillmentService = new FulfillmentService();
