import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import ProductCategory, { IProductCategory } from "@eCommerceModule/database/schemas/category/category";

export class ProductCategoryService extends BaseCrudService<IProductCategory, typeof ProductCategory> {
    constructor() {
        super(ProductCategory, "ProductCategory");
    }
}

export const categoryService = new ProductCategoryService();
