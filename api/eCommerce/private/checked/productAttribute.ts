import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createProductAttributeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/createProductAttribute.form.validator";
import {editProductAttributeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/editProductAttribute.form.validator";
import {ProductAttributeSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.schema-def";
import ProductAttribute from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {productAttributeService} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.service";
import {productAttributeToDTO, productAttributesToDTO} from "@eCommerceModule/utilities/mappers/productAttribute/productAttributeMapper.dto";
import {productAttributesToSelect} from "@eCommerceModule/utilities/mappers/productAttribute/productAttributeMapper.select";

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
    buildCreateData: buildCreateDataFromSchemaDef(ProductAttributeSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ProductAttributeSchemaDef),
    beforeDelete: async ({company, languageCode}, doc) => {
        const inUse = await ProductVariant.countDocuments({
            company: company._id,
            "attributeCombination.attribute": doc._id,
            deletedAt: null,
        });
        if (inUse > 0) {
            throw apiValidationException("product_attribute_in_use_by_variants", "", null, languageCode);
        }
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
