import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/createProduct.form.validator";
import {editProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/editProduct.form.validator";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import Product from "@eCommerceModule/database/schemas/product/product";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {ProductActions} from "@eCommerceModule/database/schemas/product/product.actions";
import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import type {TransactionEnabledParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {productsToDTO, productToDTO} from "@eCommerceModule/utilities/mappers/product/productMapper.dto";
import {productsToSelect} from "@eCommerceModule/utilities/mappers/product/productMapper.select";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {productVariantsToDTO} from "@eCommerceModule/utilities/mappers/productVariant/productVariantMapper.dto";
import {inventoriesToDTO} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.dto";
import {productReviewsToDTO} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.dto";

const mediaUpload = mediaUploadMW({
    fields: {mainImage: 1, gallery: 20, documents: 20},
    maxFileSize: 250 * 1024 * 1024,
});

async function enrichProductSingle(doc: IProduct, params: TransactionEnabledParams) {
    const dto = productToDTO(doc);
    const companyId = params.company._id;
    const ctx = {session: params.session, logger: params.logger, languageCode: params.languageCode};
    const [variants, inventories, reviews] = await Promise.all([
        productVariantService.find({product: doc._id, company: companyId}, ctx, ["product", "currency", "mainImage"], undefined, {order: 1}, 50),
        inventoryService.find({product: doc._id, company: companyId}, ctx, ["product", "variant", "warehouse"], undefined, {createdAt: -1}, 50),
        productReviewService.find({product: doc._id, company: companyId}, ctx, ["product", "order", "reviewer"], undefined, {createdAt: -1}, 50),
    ]);
    dto.variants = productVariantsToDTO(variants);
    dto.inventories = inventoriesToDTO(inventories);
    dto.reviews = productReviewsToDTO(reviews);
    return dto;
}

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
    enrichSingle: enrichProductSingle,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    buildCreateData: buildCreateDataFromSchemaDef(ProductSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ProductSchemaDef),
    actions: ProductActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
