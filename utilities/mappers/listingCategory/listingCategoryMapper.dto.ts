import type {IListingCategory} from "@eCommerceModule/database/schemas/listingCategory/listingCategory";
import type {ListingCategory} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingCategory/listingCategory.dto";
import type {ListingCategorySimple} from "armonia/src/modules/eCommerce/dto/listingCategory.dto";
import {ListingCategorySimpleSnippet} from "@eCommerceModule/database/schemas/listingCategory/listingCategory.snippets";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {mapOwnershipToDTO, mapSoftDeleteToDTO, mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function listingCategoryToDTO(cat: IListingCategory): ListingCategory {
    return {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        parentListingCategory: mapSnippet<ListingCategorySimple>()(cat.parentListingCategory, ListingCategorySimpleSnippet),
        order: cat.order,
        ...mapSoftDeleteToDTO(cat),
        ...mapOwnershipToDTO(cat),
        ...mapLifeCycleToDTO(cat),
    };
}

export function listingCategoriesToDTO(categories: IListingCategory[]): ListingCategory[] {
    return categories.map(listingCategoryToDTO);
}
