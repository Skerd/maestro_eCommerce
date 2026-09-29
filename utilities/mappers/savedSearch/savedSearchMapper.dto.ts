import type {ISavedSearch} from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import type {SavedSearch} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function savedSearchToDTO(search: ISavedSearch): SavedSearch {
    return {
        _id: search._id.toString(),
        user: mapSnippet<SimpleBlankUser>()(search.user, SimpleBlankUserSnippet),
        name: search.name || "",
        filters: search.filters || {},
        ...mapSoftDeleteToDTO(search),
        ...mapOwnershipToDTO(search),
        ...mapLifeCycleToDTO(search),
    };
}

export function savedSearchesToDTO(searches: ISavedSearch[]): SavedSearch[] {
    return searches.map(savedSearchToDTO);
}
