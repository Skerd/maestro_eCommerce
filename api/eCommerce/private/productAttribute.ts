import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createProductAttributeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/createProductAttribute.form.validator";
import {editProductAttributeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/editProductAttribute.form.validator";
import {ProductAttributeSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.schema-def";
import ProductAttribute from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {productAttributeService} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.service";
import {productAttributeToDTO, productAttributesToDTO, productAttributesToSelect} from "@eCommerceModule/utilities/mappers/productAttributeMapper.dto";

const productAttributeTransforms = {
    values: (v: unknown) => (Array.isArray(v) ? v.filter(Boolean) : []),
} as const;

const buildProductAttributeCreateFromSchemaDef = buildCreateDataFromSchemaDef(ProductAttributeSchemaDef, productAttributeTransforms);
const buildProductAttributeUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(ProductAttributeSchemaDef, productAttributeTransforms);

export const basePath = "/api/eCommerce/productAttribute";
export const {router} = createCrudRouter({
    collectionName: "productAttributes",
    model: ProductAttribute,
    service: productAttributeService,
    entityName: "ProductAttribute",
    selectSearchField: "name",
    defaultSort: {position: 1},
    createSchema: createProductAttributeFormSchema,
    editSchema: editProductAttributeFormSchema,
    toDTO: productAttributeToDTO,
    toDTOArray: productAttributesToDTO,
    toSelect: productAttributesToSelect,
    buildCreateData: async (params) => buildProductAttributeCreateFromSchemaDef(params),
    buildUpdateData: async (params, writeFields) => buildProductAttributeUpdateFromSchemaDef(params, writeFields),
    beforeDelete: async (params, doc) => {
        const inUse = await ProductVariant.countDocuments({
            company: params.company._id,
            "attributeCombination.attribute": doc._id,
            deletedAt: null,
        });
        if (inUse > 0) {
            const err: any = new Error("product_attribute_in_use_by_variants");
            err.statusCode = 409;
            throw err;
        }
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
