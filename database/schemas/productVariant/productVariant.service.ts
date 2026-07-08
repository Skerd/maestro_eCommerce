import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductVariant, {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";

export class ProductVariantService extends BaseCrudService<IProductVariant, typeof ProductVariant> {
    constructor() {
        super(ProductVariant, "ProductVariant");
    }
}

export const productVariantService = new ProductVariantService();
