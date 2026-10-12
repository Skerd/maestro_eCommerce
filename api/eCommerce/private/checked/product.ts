import {ObjectId} from "mongodb";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {createProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/createProduct.form.validator";
import {editProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/editProduct.form.validator";
import {productSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.select.form.validator";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import Product from "@eCommerceModule/database/schemas/product/product";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {assertPricedWhenActive, assertValidBundle, ProductActions} from "@eCommerceModule/database/schemas/product/product.actions";
import {productsToDTO, productToDTO} from "@eCommerceModule/utilities/mappers/product/productMapper.dto";
import {productsToSelect} from "@eCommerceModule/utilities/mappers/product/productMapper.select";
import {restoreUnlessKeyTaken} from "@eCommerceModule/utilities/services/restoreUnlessKeyTaken";

const mediaUpload = mediaUploadMW({
    fields: {mainImage: 1, gallery: 20, documents: 20},
    maxFileSize: 250 * 1024 * 1024,
});

const buildProductCreate = buildCreateDataFromSchemaDef(ProductSchemaDef);
const buildProductUpdate = buildUpdateDataFromSchemaDef(ProductSchemaDef);

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
    selectSchema: productSelectFormSchema,
    toDTO: productToDTO,
    toDTOArray: productsToDTO,
    toSelect: productsToSelect,
    /** When `productOrderId` is posted, limit the picker to products on that order. */
    extraSelectFilter: async ({productOrderId, company, logger, languageCode}) => {
        if (productOrderId == null || productOrderId === "") return {};
        if (!ObjectId.isValid(String(productOrderId))) return {_id: {$in: []}};
        const orderDoc = await productOrderService.findOne(
            {_id: new ObjectId(String(productOrderId)), company: company._id},
            {logger, languageCode},
        );
        if (!orderDoc) return {_id: {$in: []}};
        const productIds = orderDoc.items.flatMap(item => {
            const productId = nestedEntityToRef(item.product);
            return productId ? [productId] : [];
        });
        return {_id: {$in: productIds}};
    },
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    buildCreateData: async (params) => {
        const data = buildProductCreate(params);
        assertPricedWhenActive(data, params.languageCode);
        await assertValidBundle(data, params);
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildProductUpdate(params, writeFields);
        const {existing} = params;
        assertPricedWhenActive(
            {
                status: data.status ?? existing.status,
                price: "price" in data ? data.price : existing.price,
                hasVariants: data.hasVariants ?? existing.hasVariants,
            },
            params.languageCode,
        );
        if (data.type || data.bundleComponents) {
            await assertValidBundle(
                {_id: existing._id, type: data.type ?? existing.type, bundleComponents: data.bundleComponents ?? existing.bundleComponents},
                params,
            );
        }
        return data;
    },
    actions: ProductActions,
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: Product,
        service: productService,
        entityName: "Product",
        keys: ["gtin", "upc", "ean"],
        errorCode: "product_already_exists",
    }),
    rateLimits: {read: 60, write: 30, delete: 20},
});
