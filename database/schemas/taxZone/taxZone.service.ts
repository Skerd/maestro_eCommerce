import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import TaxZone, {ITaxZone} from "@eCommerceModule/database/schemas/taxZone/taxZone";

export class TaxZoneService extends BaseCrudService<ITaxZone, typeof TaxZone> {
    constructor() {
        super(TaxZone, "TaxZone");
    }
}

export const taxZoneService = new TaxZoneService();
