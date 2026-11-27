import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {platformListRouteOptions} from "@coreModule/api/platformListRoute";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CategorySchemaDef, type CreateCategoryFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {createCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/createCategory.form.validator";
import {editCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/editCategory.form.validator";
import {categorySelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.select.form.validator";
import ProductCategory, {type IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {categoriesToDTO, categoryToDTO} from "@eCommerceModule/utilities/mappers/category/categoryMapper.dto";
import {categoriesToSelect} from "@eCommerceModule/utilities/mappers/category/categoryMapper.select";

const buildCategoryUpdate = buildUpdateDataFromSchemaDef(CategorySchemaDef);

/** Walks up from the new parent: reaching the category itself would make the tree a loop. */
async function assertNotOwnAncestor(
    categoryId: ObjectId,
    parentId: ObjectId,
    params: Pick<TransactionRequiredParams, "session" | "logger" | "languageCode">,
): Promise<void> {
    const {session, logger, languageCode} = params;
    let current: ObjectId | undefined = parentId;
    const seen = new Set<string>();
    while (current && !seen.has(current.toString())) {
        if (current.equals(categoryId)) {
            throw apiValidationException("category_parent_cycle", "parent", null, languageCode);
        }
        seen.add(current.toString());
        const ancestor = await categoryService.findOne(
            {_id: current},
            {session, logger, languageCode, withDeleted: false},
            undefined,
            "parent",
        );
        current = nestedEntityToRef(ancestor?.parent);
    }
}

export const basePath = "/api/eCommerce/category";

const platformList = platformListRouteOptions<IProductCategory, CreateCategoryFormType>({
    model: ProductCategory,
    collectionName: "productcategories",
    toDTO: categoryToDTO,
    service: categoryService,
    buildCreateData: buildCreateDataFromSchemaDef(CategorySchemaDef),
});

// A platform list (D160, D195): one tree owned by the platform company and read by every shop; only the platform company
// edits it, and another shop's create is a request the platform approves.
export const {router} = createCrudRouter<IProductCategory, CreateCategoryFormType>({
    collectionName: "productcategories",
    model: ProductCategory,
    service: categoryService,
    entityName: "ProductCategory",
    // Every name, so a shop finds "Fustane" as well as "Dresses"; the label names the parent (thousands share "Accessories").
    selectSearchField: "searchText",
    selectProjection: "_id name names parent",
    selectPopulate: [{path: "parent", select: "name names"}],
    selectSort: {order: 1, name: 1},
    defaultSort: {order: 1, name: 1},
    createSchema: createCategoryFormSchema,
    editSchema: editCategoryFormSchema,
    selectSchema: categorySelectFormSchema,
    toDTO: categoryToDTO,
    toDTOArray: categoriesToDTO,
    toSelect: categoriesToSelect,
    ...platformList,
    // The platform list's approved rows, without the category being edited.
    extraSelectFilter: async (params) => {
        const platformRows = await platformList.extraSelectFilter(params);
        const {excludeCategoryId} = params;
        if (!excludeCategoryId || !ObjectId.isValid(excludeCategoryId as string)) return platformRows;
        return {...platformRows, _id: {$ne: new ObjectId(excludeCategoryId as string)}};
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildCategoryUpdate(params, writeFields);
        if (data.parent) await assertNotOwnAncestor(params.existing._id, data.parent, params);
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
