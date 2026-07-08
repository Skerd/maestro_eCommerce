import { ISavedSearch } from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import { SavedSearch } from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.form.response.type";

export function savedSearchToDTO(s: ISavedSearch | any): SavedSearch {
    return {
        _id: s._id.toString(),
        name: s.name || "",
        filters: s.filters || {},
    };
}

export function savedSearchesToDTO(searches: ISavedSearch[]): SavedSearch[] {
    return searches.map(savedSearchToDTO);
}
