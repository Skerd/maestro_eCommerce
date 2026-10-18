import type {ListingCategorySimple} from "armonia/src/modules/eCommerce/dto/listingCategory.dto";
import type {IListingCategory} from "@eCommerceModule/database/schemas/listingCategory/listingCategory";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const ListingCategorySimpleSnippet = defineSnippet<IListingCategory, ListingCategorySimple>()({
    keys: {
        _id: {},
        name: {},
        slug: {},
    },
});
