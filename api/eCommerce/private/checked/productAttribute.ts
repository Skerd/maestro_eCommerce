import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createProductAttributeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/createProductAttribute.form.validator";
import {editProductAttributeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/editProductAttribute.form.validator";
import {ProductAttributeSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.schema-def";
import ProductAttribute from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {productAttributeService} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.service";
import {productAttributeToDTO, productAttributesToDTO} from "@eCommerceModule/utilities/mappers/productAttribute/productAttributeMapper.dto";
import {productAttributesToSelect} from "@eCommerceModule/utilities/mappers/productAttribute/productAttributeMapper.select";
import {restoreUnlessKeyTaken} from "@coreModule/api/restoreUnlessKeyTaken";

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
        const inUse = await productVariantService.count({
            company: company._id,
            "attributeCombination.attribute": doc._id,
        }, {withDeleted: false});
        if (inUse > 0) {
            throw apiValidationException("product_attribute_in_use_by_variants", "", null, languageCode);
        }
    },
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: ProductAttribute,
        service: productAttributeService,
        entityName: "ProductAttribute",
        keys: ["name"],
        errorCode: "productAttribute_already_exists",
    }),
    rateLimits: {read: 60, write: 30, delete: 20},
});
