import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {SavedSearchSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.schema-def";
import {createSavedSearchFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/createSavedSearch.form.validator";
import {editSavedSearchFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/editSavedSearch.form.validator";
import {savedSearchFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.form.validator";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import {savedSearchService} from "@eCommerceModule/database/schemas/savedSearch/savedSearch.service";
import {savedSearchToDTO, savedSearchesToDTO} from "@eCommerceModule/utilities/mappers/savedSearch/savedSearchMapper.dto";
import {savedSearchesToSelect} from "@eCommerceModule/utilities/mappers/savedSearch/savedSearchMapper.select";

function savedSearchExtraListFilter(params: Record<string, any>) {
    const {customerId} = params;
    if (!customerId) return {};
    return {customer: new ObjectId(customerId)};
}

export const basePath = "/api/eCommerce/savedSearch";
export const {router} = createCrudRouter({
    collectionName: "savedsearches",
    model: SavedSearch,
    service: savedSearchService,
    entityName: "SavedSearch",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: createSavedSearchFormSchema,
    editSchema: editSavedSearchFormSchema,
    listSchema: savedSearchFormSchema,
    toDTO: savedSearchToDTO,
    toDTOArray: savedSearchesToDTO,
    toSelect: savedSearchesToSelect,
    buildCreateData: buildCreateDataFromSchemaDef(SavedSearchSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(SavedSearchSchemaDef),
    extraListFilter: savedSearchExtraListFilter,
    rateLimits: {read: 60, write: 20, delete: 20},
});

