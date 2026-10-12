import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {CategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {createCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/createCategory.form.validator";
import {editCategoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/editCategory.form.validator";
import {categorySelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.select.form.validator";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import {categoriesToDTO, categoryToDTO} from "@eCommerceModule/utilities/mappers/category/categoryMapper.dto";
import {categoriesToSelect} from "@eCommerceModule/utilities/mappers/category/categoryMapper.select";

const buildCategoryUpdate = buildUpdateDataFromSchemaDef(CategorySchemaDef);

/** Walks up from the new parent: reaching the category itself would make the tree a loop. */
async function assertNotOwnAncestor(
    categoryId: ObjectId,
    parentId: ObjectId,
    params: Pick<TransactionRequiredParams, "company" | "session" | "logger" | "languageCode">,
): Promise<void> {
    const {company, session, logger, languageCode} = params;
    let current: ObjectId | undefined = parentId;
    const seen = new Set<string>();
    while (current && !seen.has(current.toString())) {
        if (current.equals(categoryId)) {
            throw apiValidationException("category_parent_cycle", "parent", null, languageCode);
        }
        seen.add(current.toString());
        const ancestor = await categoryService.findOne(
            {_id: current, company: company._id},
            {session, logger, languageCode, withDeleted: false},
            undefined,
            "parent",
        );
        current = nestedEntityToRef(ancestor?.parent);
    }
}

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
    extraSelectFilter: async ({excludeCategoryId}) => {
        if (!excludeCategoryId || !ObjectId.isValid(excludeCategoryId as string)) return {};
        return {_id: {$ne: new ObjectId(excludeCategoryId as string)}};
    },
    buildCreateData: buildCreateDataFromSchemaDef(CategorySchemaDef),
    buildUpdateData: async (params, writeFields) => {
        const data = buildCategoryUpdate(params, writeFields);
        if (data.parent) await assertNotOwnAncestor(params.existing._id, data.parent, params);
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
