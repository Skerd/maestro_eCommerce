import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ListingCategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingCategory/listingCategory.schema-def";
import {createListingCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingCategory/createListingCategory.form.validator";
import {editListingCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingCategory/editListingCategory.form.validator";
import {listingCategorySelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingCategory/listingCategory.select.form.validator";
import ListingCategory from "@eCommerceModule/database/schemas/listingCategory/listingCategory";
import {listingCategoryService} from "@eCommerceModule/database/schemas/listingCategory/listingCategory.service";
import {listingCategoriesToDTO, listingCategoryToDTO} from "@eCommerceModule/utilities/mappers/listingCategory/listingCategoryMapper.dto";
import {listingCategoriesToSelect} from "@eCommerceModule/utilities/mappers/listingCategory/listingCategoryMapper.select";

export const basePath = "/api/eCommerceMarketplace/listingCategory";
export const {router} = createCrudRouter({
    collectionName: "listingcategories",
    model: ListingCategory,
    service: listingCategoryService,
    entityName: "ListingCategory",
    selectSearchField: "name",
    selectSort: {order: 1, name: 1},
    defaultSort: {order: 1},
    createSchema: createListingCategoryFormSchema,
    editSchema: editListingCategoryFormSchema,
    selectSchema: listingCategorySelectFormSchema,
    toDTO: listingCategoryToDTO,
    toDTOArray: listingCategoriesToDTO,
    toSelect: listingCategoriesToSelect,
    extraSelectFilter: async ({excludeCategoryId}) => {
        if (!excludeCategoryId || !ObjectId.isValid(excludeCategoryId as string)) return {};
        return {_id: {$ne: new ObjectId(excludeCategoryId as string)}};
    },
    buildCreateData: buildCreateDataFromSchemaDef(ListingCategorySchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ListingCategorySchemaDef),
    rateLimits: {read: 60, write: 30, delete: 20},
});
