import type {ISavedSearch} from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import type {SavedSearch} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {CategorySimple} from "armonia/src/modules/eCommerce/dto/category.dto";
import type {CollectionSimple} from "armonia/src/modules/eCommerce/dto/collection.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {CollectionSimpleSnippet} from "@eCommerceModule/database/schemas/collection/collection.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function savedSearchToDTO(search: ISavedSearch): SavedSearch {
    return {
        _id: search._id.toString(),
        customer: mapSnippet<SimpleBlankUser>()(search.customer, SimpleBlankUserSnippet),
        name: search.name || "",
        categoryIds: search.categoryIds
            ?.map((category) => mapSnippet<CategorySimple>()(category, CategorySimpleSnippet))
            .filter((category): category is CategorySimple => !!category),
        collectionId: mapSnippet<CollectionSimple>()(search.collectionId, CollectionSimpleSnippet),
        priceMin: search.priceMin,
        priceMax: search.priceMax,
        sort: search.sort,
        ...mapSoftDeleteToDTO(search),
        ...mapOwnershipToDTO(search),
        ...mapLifeCycleToDTO(search),
    };
}

export function savedSearchesToDTO(searches: ISavedSearch[]): SavedSearch[] {
    return searches.map(savedSearchToDTO);
}
