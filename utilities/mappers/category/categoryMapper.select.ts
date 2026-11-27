import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {categoryDisplayName} from "@eCommerceModule/utilities/helpers/categoryName";

/**
 * Picker options in the reader's language (D195). With a populated parent the label names it too ("Clothing › Dresses"),
 * since thousands of platform categories share short names ("Accessories").
 */
export function categoriesToSelect(categories: IProductCategory[]): ApiSelectDatum[] {
    return categories.map((c) => {
        const parent = c.parent && typeof c.parent === "object" && "name" in c.parent ? categoryDisplayName(c.parent) : "";
        const name = categoryDisplayName(c);
        return {value: c._id.toString(), label: parent ? `${parent} › ${name}` : name};
    });
}
