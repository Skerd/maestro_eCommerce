import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {createCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/createCategory.form.validator";
import {editCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/editCategory.form.validator";
import {categorySelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.select.form.validator";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {categoriesToDTO, categoryToDTO} from "@eCommerceModule/utilities/mappers/category/categoryMapper.dto";
import {categoriesToSelect} from "@eCommerceModule/utilities/mappers/category/categoryMapper.select";

export const basePath = "/api/eCommerce/category";
export const {router} = createCrudRouter({
    collectionName: "productcategories",
    model: ProductCategory,
    service: categoryService,
    entityName: "ProductCategory",
    selectSearchField: "name",
    selectSort: {order: 1, name: 1},
    defaultSort: {order: 1},
    createSchema: createCategoryFormSchema,
    editSchema: editCategoryFormSchema,
    selectSchema: categorySelectFormSchema,
    toDTO: categoryToDTO,
    toDTOArray: categoriesToDTO,
    toSelect: categoriesToSelect,
    extraSelectFilter: async ({parentId, excludeCategoryId}) => {
        const filter: Record<string, unknown> = {};
        if (parentId) filter.parent = new ObjectId(parentId as string);
        if (excludeCategoryId && ObjectId.isValid(excludeCategoryId as string)) {
            filter._id = {$ne: new ObjectId(excludeCategoryId as string)};
        }
        return filter;
    },
    buildCreateData: buildCreateDataFromSchemaDef(CategorySchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(CategorySchemaDef),
    rateLimits: {read: 60, write: 30, delete: 20},
});
