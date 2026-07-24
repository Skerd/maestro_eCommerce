import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PosPaymentMethod, {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";

export class PosPaymentMethodService extends BaseCrudService<IPosPaymentMethod, typeof PosPaymentMethod> {
    constructor() {
        super(PosPaymentMethod, "PosPaymentMethod");
    }
}

export const posPaymentMethodService = new PosPaymentMethodService();
