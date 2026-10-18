import {ObjectId} from "mongodb";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PromotionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/promotion/promotion.schema-def";
import {createPromotionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/promotion/createPromotion.form.validator";
import {editPromotionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/promotion/editPromotion.form.validator";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import Promotion from "@eCommerceModule/database/schemas/promotion/promotion";
import {PromotionActions} from "@eCommerceModule/database/schemas/promotion/promotion.actions";
import {promotionService} from "@eCommerceModule/database/schemas/promotion/promotion.service";
import {promotionToDTO, promotionsToDTOArray} from "@eCommerceModule/utilities/mappers/promotion/promotionMapper.dto";
import {promotionsToSelect} from "@eCommerceModule/utilities/mappers/promotion/promotionMapper.select";

const buildCreate = buildCreateDataFromSchemaDef(PromotionSchemaDef);

export const basePath = "/api/eCommerceMarketplace/promotion";
export const {router} = createCrudRouter({
    collectionName: "promotions",
    model: Promotion,
    service: promotionService,
    entityName: "Promotion",
    defaultSort: {startAt: 1},
    selectSearchField: "type",
    rateLimits: {read: 60, write: 20, delete: 20},
    actions: PromotionActions,
    createSchema: createPromotionFormSchema,
    editSchema: editPromotionFormSchema,
    toDTO: promotionToDTO,
    toDTOArray: promotionsToDTOArray,
    toSelect: promotionsToSelect,
    buildCreateData: async (params) => {
        const listing = await listingService.findOne(
            {_id: new ObjectId(params.listing), company: params.company._id, status: "active"},
            {session: params.session, logger: params.logger, languageCode: params.languageCode},
        );
        const data = buildCreate(params);
        data.listing = listing._id;
        if (data.type === undefined) data.type = "featured";
        return data;
    },
    buildUpdateData: async () =>
        ({}) /** Promotion fields use write: no-permission — pause/resume/stop via actions */,
    afterCreate: async (created, params) => {
        const {session, logger, languageCode} = params;
        const listingId = (created.listing?._id ?? created.listing)?.toString();
        if (!listingId) return;
        await listingService.updateByIdOrThrow(
            new ObjectId(listingId),
            {$push: {promotions: created._id}},
            {session, logger, languageCode},
        );
    },
    afterDelete: async (params, doc) => {
        const {session, logger, languageCode} = params;
        const listingId = (doc.listing?._id ?? doc.listing)?.toString();
        if (!listingId) return;
        await listingService.updateByIdOrThrow(
            new ObjectId(listingId),
            {$pull: {promotions: doc._id}},
            {session, logger, languageCode},
        );
    },
    overrideRestoreHandler: async (params) => {
        const {logger, languageCode, session, _id, company, actionUserCtx} = params;
        logger.start(`Restoring Promotion ${_id}...`);
        SchemaGuard.checkModelPermission(Promotion, "restore", actionUserCtx, languageCode);
        const restored = await promotionService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
        const listingId = (restored.listing?._id ?? restored.listing)?.toString();
        if (listingId) {
            await listingService.updateByIdOrThrow(
                new ObjectId(listingId),
                {$push: {promotions: restored._id}},
                {session, logger, languageCode},
            );
        }
        return {message: "Promotion successfully restored"};
    },
});
