import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Product, {IProduct} from "@eCommerceModule/database/schemas/product/product";

export class ProductService extends BaseCrudService<IProduct, typeof Product> {
    constructor() {
        super(Product, "Product");
    }
}

export const productService = new ProductService();
