import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import DigitalDelivery, {IDigitalDelivery} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";

export class DigitalDeliveryService extends BaseCrudService<IDigitalDelivery, typeof DigitalDelivery> {
    constructor() {
        super(DigitalDelivery, "DigitalDelivery");
    }
}

export const digitalDeliveryService = new DigitalDeliveryService();
