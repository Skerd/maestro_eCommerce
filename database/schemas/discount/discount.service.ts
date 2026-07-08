import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Discount, {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";

export class DiscountService extends BaseCrudService<IDiscount, typeof Discount> {
    constructor() {
        super(Discount, "Discount");
    }
}

export const discountService = new DiscountService();
