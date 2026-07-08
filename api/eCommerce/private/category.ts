import {ObjectId} from "mongodb";
import slugify from "slugify";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {createCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/createCategory.form.validator";
import {editCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/editCategory.form.validator";
import {categorySelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.select.form.validator";
import ListingCategory from "@eCommerceModule/database/schemas/category/category";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {categoriesToDTO, categoryToDTO} from "@eCommerceModule/utilities/mappers/category/categoryMapper.dto";
import {categoriesToSelect} from "@eCommerceModule/utilities/mappers/category/categoryMapper.select";

const buildCategoryCreateFromSchemaDef = buildCreateDataFromSchemaDef(CategorySchemaDef);
const buildCategoryUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(CategorySchemaDef);

export const basePath = "/api/eCommerce/category";
export const {router} = createCrudRouter({
    collectionName: "listingcategories",
    model: ListingCategory,
    service: categoryService,
    entityName: "ListingCategory",
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
    buildCreateData: async (params) => {
        const createParams = {
            ...params,
            parent: params.parentId ?? params.parent,
        };
        const data = buildCategoryCreateFromSchemaDef(createParams);
        data.slug = params.slug?.trim() || slugify(params.name);
        if (data.order === undefined) data.order = 0;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const update = buildCategoryUpdateFromSchemaDef(params, writeFields);
        if (params.slug !== undefined && writeFields.slug && typeof update.slug === "string") {
            update.slug = update.slug.trim();
        }
        if (params.name !== undefined && writeFields.name && typeof update.name === "string") {
            update.name = update.name.trim();
        }
        return update;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
