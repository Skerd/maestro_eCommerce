import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Fulfillment, {IFulfillment} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";

export class FulfillmentService extends BaseCrudService<IFulfillment, typeof Fulfillment> {
    constructor() {
        super(Fulfillment, "Fulfillment");
    }
}

export const fulfillmentService = new FulfillmentService();
