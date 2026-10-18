import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Order, {IOrder} from "@eCommerceModule/database/schemas/order/order";

export class OrderService extends BaseCrudService<IOrder, typeof Order> {
    constructor() {
        super(Order, "Order");
    }
}

export const orderService = new OrderService();
