import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductAttribute, {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";

export class ProductAttributeService extends BaseCrudService<IProductAttribute, typeof ProductAttribute> {
    constructor() {
        super(ProductAttribute, "ProductAttribute");
    }
}

export const productAttributeService = new ProductAttributeService();
