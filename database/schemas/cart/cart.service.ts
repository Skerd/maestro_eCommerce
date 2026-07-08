import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Cart, {ICart} from "@eCommerceModule/database/schemas/cart/cart";

export class CartService extends BaseCrudService<ICart, typeof Cart> {
    constructor() {
        super(Cart, "Cart");
    }
}

export const cartService = new CartService();
