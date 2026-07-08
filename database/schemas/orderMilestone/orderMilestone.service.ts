import OrderMilestone, { IOrderMilestone } from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import { BaseCrudService } from "@coreModule/database/services/baseCrudService";

export class OrderMilestoneService extends BaseCrudService<IOrderMilestone, typeof OrderMilestone> {
    constructor() {
        super(OrderMilestone, "OrderMilestone");
    }
}

export const orderMilestoneService = new OrderMilestoneService();
