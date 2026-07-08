import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {createProductVariantFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/createProductVariant.form.validator";
import {editProductVariantFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/editProductVariant.form.validator";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {productVariantToDTO, productVariantsToDTO, productVariantToSelect, productVariantsToSelect} from "@eCommerceModule/utilities/mappers/productVariantMapper.dto";

const mediaUpload = mediaUploadMW({fields: {mainImage: 1}, maxFileSize: 50 * 1024 * 1024});

const productVariantTransforms = {
    attributeCombination: (v: unknown) => v,
} as const;

const buildProductVariantCreateFromSchemaDef = buildCreateDataFromSchemaDef(ProductVariantSchemaDef, productVariantTransforms);
const buildProductVariantUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(ProductVariantSchemaDef, productVariantTransforms);

export const basePath = "/api/eCommerce/productVariant";
export const {router} = createCrudRouter({
    collectionName: "productVariants",
    model: ProductVariant,
    service: productVariantService,
    entityName: "ProductVariant",
    selectSearchField: "sku",
    defaultSort: {position: 1},
    createSchema: createProductVariantFormSchema,
    editSchema: editProductVariantFormSchema,
    toDTO: productVariantToDTO,
    toDTOArray: productVariantsToDTO,
    toSelect: productVariantsToSelect,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    extraListFilter: async ({productId}) => {
        if (!productId) return {};
        return {product: new ObjectId(productId as string)};
    },
    buildCreateData: async (params) => buildProductVariantCreateFromSchemaDef(params),
    buildUpdateData: async (params, writeFields) => buildProductVariantUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 20},
});
