import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ListingAddOnSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingAddOn/listingAddOn.schema-def";
import {createListingAddOnFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingAddOn/createListingAddOn.form.validator";
import {editListingAddOnFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingAddOn/editListingAddOn.form.validator";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import ListingAddOn from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn";
import {listingAddOnService} from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn.service";
import {listingAddOnToDTO, listingAddOnsToDTOArray} from "@eCommerceModule/utilities/mappers/listingAddOn/listingAddOnMapper.dto";
import {listingAddOnsToSelect} from "@eCommerceModule/utilities/mappers/listingAddOn/listingAddOnMapper.select";

const buildCreate = buildCreateDataFromSchemaDef(ListingAddOnSchemaDef);

export const basePath = "/api/eCommerceMarketplace/listingAddOn";
export const {router} = createCrudRouter({
    collectionName: "listingaddons",
    model: ListingAddOn,
    service: listingAddOnService,
    entityName: "ListingAddOn",
    defaultSort: {name: 1},
    createSchema: createListingAddOnFormSchema,
    editSchema: editListingAddOnFormSchema,
    toDTO: listingAddOnToDTO,
    toDTOArray: listingAddOnsToDTOArray,
    toSelect: listingAddOnsToSelect,
    buildCreateData: async (params) => {
        const {session, logger, languageCode, actionUserCtx} = params;

        const foundListing = await listingService.findOne(
            {
                _id: new ObjectId(params.listing),
                company: params.company._id,
                provider: actionUserCtx.userId
            },
            {session, logger, languageCode},
        );

        if (!foundListing) {
            throw apiValidationException("only_listing_provider_can_create_add_on", null, null, languageCode);
        }

        const data = buildCreate(params);
        const listingProvider = (foundListing as any).provider?._id ?? (foundListing as any).provider;
        data.provider = new ObjectId(listingProvider);
        return data;
    },
    buildUpdateData: buildUpdateDataFromSchemaDef(ListingAddOnSchemaDef),
    afterCreate: async (created, params) => {
        const {session, logger, languageCode} = params;
        const listingId = (created.listing?._id ?? created.listing)?.toString();
        if (!listingId) return;
        await listingService.updateByIdOrThrow(
            new ObjectId(listingId),
            {$addToSet: {listingAddOns: created._id}},
            {session, logger, languageCode},
        );
    },
    beforeDelete: async (params, doc) => {
        const providerId = (doc as any).provider?._id?.toString?.() ?? (doc as any).provider?.toString?.();
        if (!params.actionUserCtx.isAdmin && providerId !== params.actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_listing_provider_can_delete_add_on", null, null, params.languageCode);
        }
    },
    afterDelete: async (params, doc) => {
        const {session, logger, languageCode} = params;
        const listingId = (doc.listing?._id ?? doc.listing)?.toString();
        if (!listingId) return;
        await listingService.updateByIdOrThrow(
            new ObjectId(listingId),
            {$pull: {listingAddOns: doc._id}},
            {session, logger, languageCode},
        );
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
