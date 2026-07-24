import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PosOrder, {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";

export class PosOrderService extends BaseCrudService<IPosOrder, typeof PosOrder> {
    constructor() {
        super(PosOrder, "PosOrder");
    }
}

export const posOrderService = new PosOrderService();
