import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {
    createProductFormSchema
} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/createProduct.form.validator";
import {
    editProductFormSchema
} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/editProduct.form.validator";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import Product from "@eCommerceModule/database/schemas/product/product";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {ProductActions} from "@eCommerceModule/database/schemas/product/product.actions";
import {productsToDTO, productToDTO} from "@eCommerceModule/utilities/mappers/product/productMapper.dto";
import {productsToSelect} from "@eCommerceModule/utilities/mappers/product/productMapper.select";

const mediaUpload = mediaUploadMW({
    fields: {mainImage: 1, gallery: 20, documents: 20},
    maxFileSize: 250 * 1024 * 1024,
});

export const basePath = "/api/eCommerce/product";
export const {router} = createCrudRouter({
    collectionName: "products",
    model: Product,
    service: productService,
    entityName: "Product",
    selectSearchField: "title",
    defaultSort: {createdAt: -1},
    createSchema: createProductFormSchema,
    editSchema: editProductFormSchema,
    toDTO: productToDTO,
    toDTOArray: productsToDTO,
    toSelect: productsToSelect,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    buildCreateData: buildCreateDataFromSchemaDef(ProductSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ProductSchemaDef),
    actions: ProductActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
