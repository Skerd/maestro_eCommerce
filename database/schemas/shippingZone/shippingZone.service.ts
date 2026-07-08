import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ShippingZone, {IShippingZone} from "@eCommerceModule/database/schemas/shippingZone/shippingZone";

export class ShippingZoneService extends BaseCrudService<IShippingZone, typeof ShippingZone> {
    constructor() {
        super(ShippingZone, "ShippingZone");
    }
}

export const shippingZoneService = new ShippingZoneService();
