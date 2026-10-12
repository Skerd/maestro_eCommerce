import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {createProductVariantFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/createProductVariant.form.validator";
import {editProductVariantFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/editProductVariant.form.validator";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productVariantToDTO, productVariantsToDTO} from "@eCommerceModule/utilities/mappers/productVariant/productVariantMapper.dto";
import {productVariantsToSelect} from "@eCommerceModule/utilities/mappers/productVariant/productVariantMapper.select";

const mediaUpload = mediaUploadMW({fields: {mainImage: 1}, maxFileSize: 50 * 1024 * 1024});

const buildVariantCreate = buildCreateDataFromSchemaDef(ProductVariantSchemaDef);
const buildVariantUpdate = buildUpdateDataFromSchemaDef(ProductVariantSchemaDef);

type VariantParams = Pick<TransactionRequiredParams, "company" | "session" | "logger" | "languageCode" | "actionUserCtx">;

/** Order-independent key of a variant's option values, e.g. "<attr>=red|<attr>=xl". */
function combinationKey(combination: {attribute?: unknown; value?: unknown}[]): string {
    return combination
        .map(option => `${nestedEntityToRef(option.attribute)?.toString() ?? ""}=${String(option.value ?? "").trim().toLowerCase()}`)
        .sort()
        .join("|");
}

/** Rejects a second live variant of the same product with the same option values. */
async function assertCombinationFree(
    productId: unknown,
    combination: {attribute?: unknown; value?: unknown}[] | undefined,
    params: VariantParams,
    excludeId?: ObjectId,
): Promise<void> {
    if (!combination?.length) return;
    const {company, session, logger, languageCode} = params;
    const siblings = await productVariantService.find(
        {product: nestedEntityToRef(productId), company: company._id, ...(excludeId ? {_id: {$ne: excludeId}} : {})},
        {session, logger, languageCode, withDeleted: false},
        undefined,
        "attributeCombination",
    );
    const key = combinationKey(combination);
    if (siblings.some(sibling => combinationKey(sibling.attributeCombination ?? []) === key)) {
        throw apiValidationException("variant_combination_exists", "attributeCombination", null, languageCode);
    }
}

/**
 * Keeps the product's variant list and derived flags in step with its live
 * variants: `hasVariants` is true exactly when it has at least one.
 */
async function syncProductVariants(
    productId: ObjectId,
    change: {$addToSet: {variants: unknown}} | {$pull: {variants: unknown}},
    params: VariantParams,
): Promise<void> {
    const {company, session, logger, languageCode, actionUserCtx} = params;
    const variantCount = await productVariantService.count(
        {product: productId, company: company._id},
        {session, logger, languageCode, withDeleted: false},
    );
    await productService.updateByIdOrThrow(
        productId,
        {...change, $set: {variantCount, hasVariants: variantCount > 0}},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );
}

export const basePath = "/api/eCommerce/productVariant";
export const {router} = createCrudRouter({
    collectionName: "productVariants",
    model: ProductVariant,
    service: productVariantService,
    entityName: "ProductVariant",
    selectSearchField: "sku",
    defaultSort: {order: 1},
    createSchema: createProductVariantFormSchema,
    editSchema: editProductVariantFormSchema,
    toDTO: productVariantToDTO,
    toDTOArray: productVariantsToDTO,
    toSelect: productVariantsToSelect,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    buildCreateData: async (params) => {
        await assertCombinationFree(params.product, params.attributeCombination, params);
        return buildVariantCreate(params);
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildVariantUpdate(params, writeFields);
        // A variant belongs to its product for good: its stock rows and order lines are keyed on both
        delete data.product;
        if (data.attributeCombination) {
            await assertCombinationFree(params.existing.product, data.attributeCombination, params, params.existing._id);
        }
        return data;
    },
    afterCreate: async (created, params) => {
        const productId = nestedEntityToRef(created.product);
        if (productId) await syncProductVariants(productId, {$addToSet: {variants: created._id}}, params);
    },
    afterDelete: async (params, doc) => {
        const productId = nestedEntityToRef(doc.product);
        if (productId) await syncProductVariants(productId, {$pull: {variants: doc._id}}, params);
    },
    overrideRestoreHandler: async (params) => {
        const {logger, languageCode, session, _id, company, actionUserCtx} = params;
        SchemaGuard.checkModelPermission(ProductVariant, "restore", actionUserCtx, languageCode);

        const deleted = await productVariantService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, withDeleted: true},
        );
        await assertCombinationFree(deleted.product, deleted.attributeCombination, params, deleted._id);

        const restored = await productVariantService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const productId = nestedEntityToRef(restored.product);
        if (productId) await syncProductVariants(productId, {$addToSet: {variants: restored._id}}, params);

        return {message: "ProductVariant successfully restored"};
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
