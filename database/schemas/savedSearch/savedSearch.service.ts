/**
 * SavedSearch Service
 */

import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import SavedSearch, { ISavedSearch } from "@eCommerceModule/database/schemas/savedSearch/savedSearch";

export class SavedSearchService extends BaseCrudService<ISavedSearch, typeof SavedSearch> {
    constructor() {
        super(SavedSearch, "SavedSearch");
    }
}

export const savedSearchService = new SavedSearchService();
