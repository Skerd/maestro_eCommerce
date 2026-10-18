import type {IListingCategory} from "@eCommerceModule/database/schemas/listingCategory/listingCategory";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function listingCategoriesToSelect(categories: IListingCategory[]): ApiSelectDatum[] {
    return categories.map((c) => ({
        value: c._id.toString(),
        label: c.name,
    }));
}
