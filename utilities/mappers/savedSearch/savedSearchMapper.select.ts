import type {ISavedSearch} from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function savedSearchToSelect(search: ISavedSearch): ApiSelectDatum {
    return {value: search._id.toString(), label: search.name};
}

export function savedSearchesToSelect(searches: ISavedSearch[]): ApiSelectDatum[] {
    return searches.map(savedSearchToSelect);
}
