import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createCollectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/createCollection.form.validator";
import {editCollectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/editCollection.form.validator";
import {CollectionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import {collectionService} from "@eCommerceModule/database/schemas/collection/collection.service";
import {collectionToDTO, collectionsToDTO, collectionToSelect, collectionsToSelect} from "@eCommerceModule/utilities/mappers/collectionMapper.dto";
import {generateUniqueSlug} from "@eCommerceModule/utilities/services/slugGenerationService";
import {buildProductFilterFromCollectionRules} from "@eCommerceModule/utilities/services/collectionRuleEngine";
import Product from "@eCommerceModule/database/schemas/product/product";

const mediaUpload = mediaUploadMW({fields: {mainImage: 1}, maxFileSize: 50 * 1024 * 1024});

const collectionTransforms = {
    rules: (v: unknown) => v,
} as const;

const buildCollectionCreateFromSchemaDef = buildCreateDataFromSchemaDef(CollectionSchemaDef, collectionTransforms);
const buildCollectionUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(CollectionSchemaDef, collectionTransforms);

export const basePath = "/api/eCommerce/collection";
export const {router} = createCrudRouter({
    collectionName: "productCollections",
    model: ProductCollection,
    service: collectionService,
    entityName: "Collection",
    selectSearchField: "name",
    defaultSort: {createdAt: -1},
    createSchema: createCollectionFormSchema,
    editSchema: editCollectionFormSchema,
    toDTO: collectionToDTO,
    toDTOArray: collectionsToDTO,
    toSelect: collectionsToSelect,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    buildCreateData: async (params) => {
        const data = buildCollectionCreateFromSchemaDef(params);
        data.slug = await generateUniqueSlug(params.slug || params.name, ProductCollection, params.company._id);
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const update = buildCollectionUpdateFromSchemaDef(params, writeFields);
        if (params.name !== undefined && writeFields.name) {
            update.slug = await generateUniqueSlug(
                params.slug || params.name,
                ProductCollection,
                params.company._id,
                params._id ? new ObjectId(params._id as string) : undefined,
            );
        } else if (params.slug !== undefined && writeFields.slug) {
            update.slug = await generateUniqueSlug(
                params.slug,
                ProductCollection,
                params.company._id,
                params._id ? new ObjectId(params._id as string) : undefined,
            );
        }
        return update;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});

// Rebuild dynamic collection
router.post(
    "/rebuild-dynamic",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company} = req;
        const {collectionId} = req.body;
        if (!collectionId) return res.status(400).json({message: "collectionId required"});

        const collection = await collectionService.findOneOrThrow(
            {_id: new ObjectId(collectionId), company: company._id, type: "dynamic"},
            {logger, languageCode},
        );

        const rules = (collection.rules as any[]) ?? [];
        if (!rules.length) return res.json({message: "No rules defined", productCount: 0});

        const mongoFilter = buildProductFilterFromCollectionRules(
            company._id,
            rules,
            collection.ruleCondition ?? "all",
        );

        const matchingProducts = await Product.find(mongoFilter, {_id: 1}).lean();
        const productIds = matchingProducts.map((p: any) => p._id);

        await ProductCollection.updateOne(
            {_id: collection._id},
            {$set: {products: productIds}},
        );

        return res.json({message: "Collection rebuilt", productCount: productIds.length});
    }),
);
