import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const CategorySimpleSnippet = defineSnippet<IProductCategory, CategorySimple>()({
    keys: {
        _id: {},
        name: {},
        slug: {},
    },
});
