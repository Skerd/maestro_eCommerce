import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {createProductVariantFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/createProductVariant.form.validator";
import {editProductVariantFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/editProductVariant.form.validator";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productVariantToDTO, productVariantsToDTO} from "@eCommerceModule/utilities/mappers/productVariant/productVariantMapper.dto";
import {productVariantsToSelect} from "@eCommerceModule/utilities/mappers/productVariant/productVariantMapper.select";

const mediaUpload = mediaUploadMW({fields: {mainImage: 1}, maxFileSize: 50 * 1024 * 1024});

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
    buildCreateData: buildCreateDataFromSchemaDef(ProductVariantSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ProductVariantSchemaDef),
    afterCreate: async (created, params) => {
        const {session, logger, languageCode, actionUserCtx} = params;
        const productId = nestedEntityToRef(created.product);
        if (!productId) return;
        await productService.updateByIdOrThrow(
            productId,
            {$push: {variants: created._id}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId, auditAction: "create"},
        );
    },
    afterUpdate: async (params, existing) => {
        const {session, logger, languageCode, actionUserCtx, product, sanitizedWriteFields} = params;
        if (!sanitizedWriteFields?.product || product == null) return;
        const prevId = nestedEntityToRef(existing.product);
        const nextId = typeof product === "string" ? new ObjectId(product) : nestedEntityToRef(product);
        if (!prevId || !nextId || prevId.toString() === nextId.toString()) return;
        const ctx = {session, logger, languageCode, auditUserId: actionUserCtx.userId};
        await productService.updateByIdOrThrow(prevId, {$pull: {variants: existing._id}}, ctx);
        await productService.updateByIdOrThrow(nextId, {$push: {variants: existing._id}}, ctx);
    },
    afterDelete: async (params, doc) => {
        const {session, logger, languageCode, actionUserCtx} = params;
        const productId = nestedEntityToRef(doc.product);
        if (!productId) return;
        await productService.updateByIdOrThrow(
            productId,
            {$pull: {variants: doc._id}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
    },
    overrideRestoreHandler: async (params) => {
        const {logger, languageCode, session, _id, company, actionUserCtx} = params;
        SchemaGuard.checkModelPermission(ProductVariant, "restore", actionUserCtx, languageCode);

        const restored = await productVariantService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const productId = nestedEntityToRef(restored.product);
        if (productId) {
            await productService.updateByIdOrThrow(
                productId,
                {$push: {variants: restored._id}},
                {session, logger, languageCode, auditUserId: actionUserCtx.userId, auditAction: "restore"},
            );
        }

        return {message: "ProductVariant successfully restored"};
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
