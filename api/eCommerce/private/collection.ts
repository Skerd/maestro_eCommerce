import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createCollectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/createCollection.form.validator";
import {editCollectionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/editCollection.form.validator";
import {CollectionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
import ProductCollection from "@eCommerceModule/database/schemas/collection/collection";
import {collectionService} from "@eCommerceModule/database/schemas/collection/collection.service";
import {collectionToDTO, collectionsToDTO} from "@eCommerceModule/utilities/mappers/collection/collectionMapper.dto";
import {collectionsToSelect} from "@eCommerceModule/utilities/mappers/collection/collectionMapper.select";
import {
    rebuildDynamicCollectionMembership,
} from "@eCommerceModule/utilities/services/collection/rebuildDynamicCollection";

const mediaUpload = mediaUploadMW({fields: {mainImage: 1}, maxFileSize: 50 * 1024 * 1024});

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
    buildCreateData: buildCreateDataFromSchemaDef(CollectionSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(CollectionSchemaDef),
    afterCreate: async (created, params) => {
        if (created.type === "dynamic") {
            await rebuildDynamicCollectionMembership(created, {session: params.session});
        }
    },
    afterUpdate: async (params, existing) => {
        const typeChanged = params.type !== undefined && params.type !== existing.type;
        const conditionChanged = params.ruleCondition !== undefined && params.ruleCondition !== existing.ruleCondition;
        const rulesChanged = params.rules !== undefined
            && JSON.stringify(params.rules ?? []) !== JSON.stringify(existing.rules ?? []);
        if (!typeChanged && !conditionChanged && !rulesChanged) return;

        const updated = await collectionService.findById(existing._id, {
            session: params.session,
            logger: params.logger,
        });
        if (!updated || updated.type !== "dynamic") return;

        await rebuildDynamicCollectionMembership(updated, {session: params.session});
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
