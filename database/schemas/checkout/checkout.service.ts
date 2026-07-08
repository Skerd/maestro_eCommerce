import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Checkout, {ICheckout} from "@eCommerceModule/database/schemas/checkout/checkout";

export class CheckoutService extends BaseCrudService<ICheckout, typeof Checkout> {
    constructor() {
        super(Checkout, "Checkout");
    }
}

export const checkoutService = new CheckoutService();
