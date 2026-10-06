import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createCollectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/createCollection.form.validator";
import {editCollectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/editCollection.form.validator";
import {CollectionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
import ProductCollection, {type ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {collectionService} from "@eCommerceModule/database/schemas/collection/collection.service";
import {collectionToDTO, collectionsToDTO} from "@eCommerceModule/utilities/mappers/collection/collectionMapper.dto";
import {collectionsToSelect} from "@eCommerceModule/utilities/mappers/collection/collectionMapper.select";
import {countCollectionProducts} from "@eCommerceModule/utilities/services/collection/collectionMembership";
import {CollectionActions} from "@eCommerceModule/database/schemas/collection/collection.actions";
import type {Collection} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.dto";

const mediaUpload = mediaUploadMW({fields: {mainImage: 1}, maxFileSize: 50 * 1024 * 1024});
const buildCreate = buildCreateDataFromSchemaDef(CollectionSchemaDef);
const buildUpdate = buildUpdateDataFromSchemaDef(CollectionSchemaDef);

async function enrichCollection(doc: ICollection, companyId: ICollection["company"]["_id"]): Promise<Collection> {
    const dto = collectionToDTO(doc);
    if (doc.type === "dynamic") {
        dto.products = [];
        dto.productCount = await countCollectionProducts(doc, companyId);
    }
    return dto;
}

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
    buildCreateData: (params) => {
        const data = buildCreate(params);
        if (data.type === "dynamic") data.products = [];
        if (data.type === "manual") {
            delete data.rules;
            delete data.ruleCondition;
        }
        return data;
    },
    buildUpdateData: (params, writeFields) => {
        const data = buildUpdate(params, writeFields);
        const effectiveType = params.type !== undefined ? params.type : params.existing?.type;
        if (effectiveType === "dynamic") data.products = [];
        if (effectiveType === "manual") {
            // null → $unset in createCrudRouter
            data.rules = null;
            data.ruleCondition = null;
        }
        return data;
    },
    enrichList: async (docs, params) => Promise.all(docs.map((doc) => enrichCollection(doc, params.company._id))),
    enrichSingle: async (doc, params) => enrichCollection(doc, params.company._id),
    enrichUpdate: async (doc, params) => enrichCollection(doc, params.company._id),
    actions: CollectionActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
