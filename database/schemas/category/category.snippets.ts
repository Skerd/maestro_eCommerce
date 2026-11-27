import type {CategorySimpleSource} from "armonia/src/modules/eCommerce/dto/category.dto";
import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

/** Reads `names` too, so a reference is named in the reader's language; only `name` is sent (D195). */
export const CategorySimpleSnippet = defineSnippet<IProductCategory, CategorySimpleSource>()({
    keys: {
        _id: {},
        name: {},
        names: {},
        slug: {},
    },
});
