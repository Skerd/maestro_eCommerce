import {ObjectId} from "mongodb";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {ListingActions} from "@eCommerceModule/database/schemas/listing/listing.actions";
import {
    ListingSchemaDef,
    type CreateListingFormType,
    type EditListingFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.schema-def";
import {createListingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/createListing.form.validator";
import {editListingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/editListing.form.validator";
import {listingTableFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.form.validator";
import {listingSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.select.form.validator";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {promotionService} from "@eCommerceModule/database/schemas/promotion/promotion.service";
import {listingToDTO, listingsToDTO} from "@eCommerceModule/utilities/mappers/listing/listingMapper.dto";
import {listingsToSelect} from "@eCommerceModule/utilities/mappers/listing/listingMapper.select";
import {assertOwnerOrAdmin} from "@eCommerceModule/utilities/services/marketplaceAccess";
import type {SelectResponse} from "armonia/src/modules/core/types/shared.types";
import {escapeRegex} from "@coreModule/utilities/helpers";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import Listing, {type IListing} from "@eCommerceModule/database/schemas/listing/listing";

const mediaUpload = mediaUploadMW({
    fields: {
        mainImage: 1,
        imageGallery: 8,
        videoGallery: 3,
    },
    maxFileSize: 250 * 1024 * 1024,
});

const buildCreate = buildCreateDataFromSchemaDef(ListingSchemaDef);
const buildUpdate = buildUpdateDataFromSchemaDef(ListingSchemaDef);

export const basePath = "/api/eCommerceMarketplace/listing";
export const {router} = createCrudRouter<IListing, CreateListingFormType, EditListingFormType>({
    collectionName: "listings",
    model: Listing,
    service: listingService,
    entityName: "Listing",
    defaultSort: {createdAt: -1},
    listSchema: listingTableFormSchema,
    selectSchema: listingSelectFormSchema,
    createSchema: createListingFormSchema,
    editSchema: editListingFormSchema,
    toDTO: listingToDTO,
    toDTOArray: listingsToDTO,
    toSelect: listingsToSelect,
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    extraListFilter: async ({featuredOnly, company, logger, languageCode}) => {
        if (!featuredOnly) return {};

        const now = new Date();
        /** Dates live on Promotion docs; Listing.promotions is ObjectId[] — cannot $elemMatch startAt/endAt on Listing. */
        const activePromotions = await promotionService.find(
            {
                company: company._id,
                lifecycleStatus: "active",
                startAt: {$lte: now},
                endAt: {$gte: now},
            },
            {logger, languageCode},
            null,
            "_id listing",
            {startAt: 1},
        );

        return {
            _id: {$in: activePromotions.map((promotion) => nestedEntityToRef(promotion.listing))},
            /** Listing row must reference at least one currently active promotion. */
            promotions: {$in: activePromotions.map((promotion) => promotion._id)},
        };
    },
    overrideSelectHandler: async (params): Promise<SelectResponse> => {
        const {logger, languageCode, company, name, limit, page, activeOnly, actionUserCtx} = params;

        logger.start("Fetching listings for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(Listing, {name: {}, title: {}}, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, Listing.schema);

        const filter: Record<string, unknown> = {company: company._id};
        if (name?.trim()) {
            const term = escapeRegex(name.trim());
            filter.$or = [
                {name: {$regex: term, $options: "i"}},
                {title: {$regex: term, $options: "i"}},
            ];
        }
        if (activeOnly) {
            filter.status = "active";
        }

        const [listings, total] = await Promise.all([
            listingService.find(filter, {logger, languageCode}, populate.populate, populate.select, {createdAt: -1}, limit, (page - 1) * limit),
            listingService.count(filter, {logger, languageCode}),
        ]);

        logger.finish("Finished fetching listings for select!");

        return {data: listingsToSelect(listings), total};
    },
    buildCreateData: (params) => ({
        ...buildCreate(params),
        provider: new ObjectId(params.actionUserCtx.userId),
    }),
    buildUpdateData: (params, writeFields) => {
        assertOwnerOrAdmin(params.existing.provider, params.actionUserCtx, params.languageCode);
        return buildUpdate(params, writeFields);
    },
    beforeDelete: async (params, doc) => {
        assertOwnerOrAdmin(doc.provider, params.actionUserCtx, params.languageCode);
        await assertCanDelete(Listing.modelName, doc._id, params.languageCode, params.session);
    },
    rateLimits: {read: 60, write: 30, delete: 20},
    actions: ListingActions,
});
