import {requestContext} from "@coreModule/utilities/endpoints/requestContext";
import type {CategoryNames} from "@eCommerceModule/database/schemas/category/category";

/** The `names` key of each panel language (`sq-AL` → `sq`). */
function nameKey(languageCode: string | undefined): keyof CategoryNames {
    const key = (languageCode ?? "en").slice(0, 2).toLowerCase();
    return key === "sq" || key === "de" || key === "fr" || key === "it" ? key : "en";
}

/**
 * A platform category's name in the request's language (D195), else its English `name`. For labels and the shop's
 * pages; a record keeps its stored names, so reading never saves a translation.
 */
export function categoryDisplayName(
    category: {name?: string; names?: CategoryNames | null},
    languageCode = requestContext.getStore()?.languageCode,
): string {
    return category.names?.[nameKey(languageCode)]?.trim() || category.name || "";
}
