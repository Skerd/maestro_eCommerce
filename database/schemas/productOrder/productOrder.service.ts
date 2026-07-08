import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductOrder, {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";

export class ProductOrderService extends BaseCrudService<IProductOrder, typeof ProductOrder> {
    constructor() {
        super(ProductOrder, "ProductOrder");
    }
}

export const productOrderService = new ProductOrderService();
