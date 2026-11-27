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
import {categoriesToDTO, categoryEditToDTO, categoryToDTO} from "@eCommerceModule/utilities/mappers/category/categoryMapper.dto";
import {categoriesToSelect} from "@eCommerceModule/utilities/mappers/category/categoryMapper.select";
import {shopSettingsService} from "@eCommerceModule/database/schemas/shopSettings/shopSettings.service";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {platformListClause} from "@coreModule/utilities/security/platformAccess";
import {categoryDisplayName} from "@eCommerceModule/utilities/helpers/categoryName";
import {categoryTreeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/categoryTree.form.validator";
import type {CategoryTreeFormType, CategoryTreeResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/categoryTree.types";

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
    // Only the single read, which the edit form loads, carries every language's name (D195).
    enrichSingle: async (doc) => categoryEditToDTO(doc),
    ...platformList,
    // The platform list's approved rows, without the category being edited.
    extraSelectFilter: async (params) => {
        const filter: Record<string, unknown> = {...await platformList.extraSelectFilter(params)};
        const {excludeCategoryId, topLevel, inShopBranches, company, session, logger, languageCode} = params;
        if (excludeCategoryId && ObjectId.isValid(excludeCategoryId as string)) filter._id = {$ne: new ObjectId(excludeCategoryId as string)};
        // What we sell (P26.8): the settings page picks among the top-level branches, and the product form offers only
        // the branches the shop sells in, when it picked any.
        if (topLevel === true) filter.parent = null;
        if (inShopBranches === true) {
            const branches = await shopSettingsService.branchesOf(company._id, {session, logger, languageCode});
            if (branches.length > 0) filter.branch = {$in: branches};
        }
        return filter;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildCategoryUpdate(params, writeFields);
        if (data.parent) await assertNotOwnAncestor(params.existing._id, data.parent, params);
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

const TREE_LEVEL_LIMIT = 500;
const TREE_SEARCH_LIMIT = 50;

/** How many categories sit directly under each of `ids`, in what the company sees. */
async function childCounts(ids: ObjectId[], visible: Record<string, unknown>): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (ids.length === 0) return counts;
    for (const child of await categoryService.find({...visible, parent: {$in: ids}}, {}, undefined, "parent")) {
        const parent = String(nestedEntityToRef(child.parent));
        counts.set(parent, (counts.get(parent) ?? 0) + 1);
    }
    return counts;
}

/** The names above each category, top level first, one query per level. */
async function ancestorPaths(rows: IProductCategory[]): Promise<Map<string, string[]>> {
    const byId = new Map<string, IProductCategory>();
    let wanted = rows.map((row) => nestedEntityToRef(row.parent)).filter((id): id is ObjectId => !!id);
    while (wanted.length > 0) {
        const found = await categoryService.find({_id: {$in: wanted}}, {}, undefined, "_id name names parent");
        for (const row of found) byId.set(String(row._id), row);
        wanted = found.map((row) => nestedEntityToRef(row.parent)).filter((id): id is ObjectId => !!id && !byId.has(String(id)));
    }
    const paths = new Map<string, string[]>();
    for (const row of rows) {
        const path: string[] = [];
        let parent = nestedEntityToRef(row.parent);
        while (parent) {
            const ancestor = byId.get(String(parent));
            if (!ancestor) break;
            path.unshift(categoryDisplayName(ancestor));
            parent = nestedEntityToRef(ancestor.parent);
        }
        paths.set(String(row._id), path);
    }
    return paths;
}

/**
 * The hierarchy view of the platform tree (D195): one level at a time (thousands of categories never load at once),
 * each with how many categories sit under it, or a search in any language with each match's path. A company sees what
 * its list shows: the platform's approved categories and its own requests.
 */
async function categoryTree(params: AuthenticatedMWType & CategoryTreeFormType): Promise<CategoryTreeResponse> {
    const {company, actionUserCtx, languageCode, logger, parent, search} = params;
    SchemaGuard.sanitizeFields(ProductCategory, {name: {}}, "read", actionUserCtx, languageCode);
    const visible = await platformListClause(company);
    const opts = {logger, languageCode};
    const select = "_id name names slug parent requestStatus";
    const term = search?.trim();
    const limit = term ? TREE_SEARCH_LIMIT : TREE_LEVEL_LIMIT;
    const rows = term
        ? await categoryService.find({...visible, searchText: {$regex: escapeRegex(term.toLowerCase()), $options: "i"}}, opts, undefined, select, {order: 1, name: 1}, limit + 1)
        : await categoryService.find({...visible, parent: parent ? new ObjectId(parent) : null}, opts, undefined, select, {order: 1, name: 1}, limit + 1);
    const shown = rows.slice(0, limit);
    const counts = await childCounts(shown.map((row) => row._id), visible);
    const paths = term ? await ancestorPaths(shown) : undefined;
    return {
        data: shown.map((row) => ({
            _id: String(row._id),
            name: categoryDisplayName(row),
            slug: row.slug,
            childCount: counts.get(String(row._id)) ?? 0,
            ...(row.requestStatus ? {requestStatus: row.requestStatus} : {}),
            ...(paths ? {path: paths.get(String(row._id)) ?? []} : {}),
        })),
        truncated: rows.length > limit,
    };
}

router.post(
    "/tree",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(categoryTreeFormSchema),
    asyncHandler(categoryTree),
);
