import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import ListingCategory, { ICategory } from "@eCommerceModule/database/schemas/category/category";

export class ListingCategoryService extends BaseCrudService<ICategory, typeof ListingCategory> {
    constructor() {
        super(ListingCategory, "ListingCategory");
    }
}

export const categoryService = new ListingCategoryService();
