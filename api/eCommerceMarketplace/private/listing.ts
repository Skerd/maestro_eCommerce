import {ObjectId} from "mongodb";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ListingActions} from "@eCommerceModule/database/schemas/listing/listing.actions";
import {ListingSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.schema-def";
import {createListingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/createListing.form.validator";
import {editListingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/editListing.form.validator";
import {listingTableFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.form.validator";
import {listingSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.select.form.validator";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {promotionService} from "@eCommerceModule/database/schemas/promotion/promotion.service";
import {listingToDTO, listingsToDTO} from "@eCommerceModule/utilities/mappers/listing/listingMapper.dto";
import {listingsToSelect,} from "@eCommerceModule/utilities/mappers/listing/listingMapper.select";
import type {SelectResponse} from "armonia/src/modules/core/types/shared.types";
import {escapeRegex} from "@coreModule/utilities/helpers";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import Listing from "@eCommerceModule/database/schemas/listing/listing";

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
export const {router} = createCrudRouter({
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
        const activePromotionFilter = {
            company: company._id,
            lifecycleStatus: "active",
            startAt: {$lte: now},
            endAt: {$gte: now},
        };

        const activePromotions = await promotionService.find(
            activePromotionFilter,
            {logger, languageCode},
            null,
            "_id listing",
            {startAt: 1},
        );

        if (activePromotions.length === 0) {
            return {_id: {$in: []}};
        }

        const activePromotionIds = activePromotions.map((p) => p._id);
        const listingIds = [
            ...new Set(
                activePromotions
                    .map((p) => {
                        const listing = p.listing as {_id?: ObjectId} | ObjectId | undefined;
                        return (listing && typeof listing === "object" && "_id" in listing
                            ? listing._id
                            : listing)?.toString?.();
                    })
                    .filter(Boolean) as string[],
            ),
        ];

        return {
            _id: {$in: listingIds.map((id) => new ObjectId(id))},
            /** Listing row must reference at least one currently active promotion. */
            promotions: {$in: activePromotionIds},
        };
    },
    overrideSelectHandler: async (params): Promise<SelectResponse> => {
        const {logger, languageCode, company, name, limit = 20, page = 1, activeOnly, actionUserCtx} = params;

        logger.start("Fetching listings for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(Listing, { name: {}, title: {} }, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, Listing.schema);

        const filter: Record<string, unknown> = {company: company._id};
        if (name?.trim()) {
            filter["$or"] = {
                name: {$regex: escapeRegex(name.trim()), $options: "i"},
                title: {$regex: escapeRegex(name.trim()), $options: "i"}
            }
        }
        if( activeOnly ){
            filter["status"] = "active";
        }

        const offset = (page - 1) * limit;
        const [listings, total] = await Promise.all([
            listingService.find(filter, {logger, languageCode}, populate.populate, populate.select, {createdAt: -1}, limit, offset),
            listingService.count(filter, {logger, languageCode}),
        ]);

        logger.finish("Finished fetching listings for select!");

        return {data: listingsToSelect(listings), total};
    },
    buildCreateData: async (params) => {
        const userId = params.actionUserCtx?.userId ?? params.userInfo?._id;
        const data = buildCreate(params);
        data.provider = new ObjectId(userId);
        return data;
    },
    buildUpdateData: buildUpdate,
    extraSelectFilter: async ({activeOnly}) => {
        if (!activeOnly) return {};
        return {status: "active"};
    },
    rateLimits: {read: 60, write: 30, delete: 20},
    actions: ListingActions,
});
