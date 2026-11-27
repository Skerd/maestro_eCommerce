import {listDisplayName} from "@coreModule/utilities/helpers/listNames";

/**
 * A platform category's name in the request's language (D195), else its English `name`. For labels and the shop's
 * pages; a record keeps its stored names, so reading never saves a translation.
 */
export const categoryDisplayName = listDisplayName;
