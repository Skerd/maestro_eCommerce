import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function categoriesToSelect(categories: IProductCategory[]): ApiSelectDatum[] {
    return categories.map((c) => ({
        value: c._id.toString(),
        label: c.name,
    }));
}
