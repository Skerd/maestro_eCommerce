import {ObjectId} from "mongodb";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ListingPackageSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingPackage/listingPackage.schema-def";
import {createListingPackageFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingPackage/createListingPackage.form.validator";
import {editListingPackageFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingPackage/editListingPackage.form.validator";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import ListingPackage from "@eCommerceModule/database/schemas/listingPackage/listingPackage";
import {listingPackageService} from "@eCommerceModule/database/schemas/listingPackage/listingPackage.service";
import {listingPackageToDTO, listingPackagesToDTOArray} from "@eCommerceModule/utilities/mappers/listingPackage/listingPackageMapper.dto";
import {listingPackagesToSelect} from "@eCommerceModule/utilities/mappers/listingPackage/listingPackageMapper.select";

const buildCreate = buildCreateDataFromSchemaDef(ListingPackageSchemaDef);

export const basePath = "/api/eCommerceMarketplace/listingPackage";
export const {router} = createCrudRouter({
    collectionName: "listingpackages",
    model: ListingPackage,
    service: listingPackageService,
    entityName: "ListingPackage",
    defaultSort: {order: 1, name: 1},
    createSchema: createListingPackageFormSchema,
    editSchema: editListingPackageFormSchema,
    toDTO: listingPackageToDTO,
    toDTOArray: listingPackagesToDTOArray,
    toSelect: listingPackagesToSelect,
    buildCreateData: async (params) => {
        const {session, logger, languageCode, actionUserCtx} = params;

        const foundListing = await listingService.findOne(
            {
                _id: new ObjectId(params.listing),
                company: params.company._id,
                provider: actionUserCtx.userId,
            },
            {session, logger, languageCode},
        );

        if (!foundListing) {
            throw apiValidationException("only_listing_provider_can_create_package", null, null, languageCode);
        }

        const data = buildCreate(params);
        const listingProvider = (foundListing as any).provider?._id ?? (foundListing as any).provider;
        data.provider = new ObjectId(listingProvider);
        if (data.description === undefined) data.description = "";
        if (data.deliveryDays === undefined) data.deliveryDays = 1;
        if (data.order === undefined) data.order = 0;
        return data;
    },
    buildUpdateData: buildUpdateDataFromSchemaDef(ListingPackageSchemaDef),
    afterCreate: async (created, params) => {
        const {session, logger, languageCode} = params;
        const listingId = (created.listing?._id ?? created.listing)?.toString();
        if (!listingId) return;
        await listingService.updateByIdOrThrow(
            new ObjectId(listingId),
            {$addToSet: {listingPackages: created._id}},
            {session, logger, languageCode},
        );
    },
    beforeDelete: async (params, doc) => {
        const providerId = (doc as any).provider?._id?.toString?.() ?? (doc as any).provider?.toString?.();
        if (!params.actionUserCtx.isAdmin && providerId !== params.actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_listing_provider_can_delete_package", null, null, params.languageCode);
        }
    },
    afterDelete: async (params, doc) => {
        const {session, logger, languageCode} = params;
        const listingId = (doc.listing?._id ?? doc.listing)?.toString();
        if (!listingId) return;
        await listingService.updateByIdOrThrow(
            new ObjectId(listingId),
            {$pull: {listingPackages: doc._id}},
            {session, logger, languageCode},
        );
    },
    overrideRestoreHandler: async (params) => {
        const {logger, languageCode, session, _id, company, actionUserCtx} = params;
        logger.start(`Restoring ListingPackage ${_id}...`);
        SchemaGuard.checkModelPermission(ListingPackage, "restore", actionUserCtx, languageCode);
        const restored = await listingPackageService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
        const listingId = (restored.listing?._id ?? restored.listing)?.toString();
        if (listingId) {
            await listingService.updateByIdOrThrow(
                new ObjectId(listingId),
                {$addToSet: {listingPackages: restored._id}},
                {session, logger, languageCode},
            );
        }
        return {message: "ListingPackage successfully restored"};
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
