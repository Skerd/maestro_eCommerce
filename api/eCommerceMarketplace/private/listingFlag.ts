import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {listingFlagService} from "@eCommerceModule/database/schemas/listingFlag/listingFlag.service";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import ListingFlag from "@eCommerceModule/database/schemas/listingFlag/listingFlag";
import {ListingFlagActions} from "@eCommerceModule/database/schemas/listingFlag/listingFlag.actions";
import {createListingFlagFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingFlag/createListingFlag.form.validator";
import {updateListingFlagFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingFlag/updateListingFlag.form.validator";
import {listingFlagToDTO, listingFlagsToDTO} from "@eCommerceModule/utilities/mappers/listingFlag/listingFlagMapper.dto";
import {listingFlagsToSelect} from "@eCommerceModule/utilities/mappers/listingFlag/listingFlagMapper.select";

export const basePath = "/api/eCommerceMarketplace/listingFlag";
export const {router} = createCrudRouter({
    collectionName: "listingflags",
    model: ListingFlag,
    service: listingFlagService,
    entityName: "ListingFlag",
    defaultSort: {createdAt: -1},
    selectSearchField: "reason",
    rateLimits: {read: 60, write: 30, delete: 20},
    createSchema: createListingFlagFormSchema,
    editSchema: updateListingFlagFormSchema,
    toDTO: listingFlagToDTO,
    toDTOArray: listingFlagsToDTO,
    toSelect: listingFlagsToSelect,
    actions: ListingFlagActions,
    extraListFilter: async ({actionUserCtx}) => {
        if (actionUserCtx.isAdmin) {
            return {};
        }
        return {user: actionUserCtx.userId};
    },
    /** Domain-guard create (like productReview): listing existence/duplicate checks; user derived. status default on schema. */
    buildCreateData: async ({listing: listingRef, reason, comment, actionUserCtx, company, session, logger, languageCode}) => {
        const listing = await listingService.findById(
            new ObjectId(listingRef),
            {session, logger, languageCode},
            "",
            "_id company",
        );
        const listingCompanyId = (listing as any)?.company?._id ?? (listing as any)?.company;
        if (!listing || listingCompanyId?.toString?.() !== company._id.toString()) {
            throw apiValidationException("listing_not_found", null, null, languageCode);
        }

        const existing = await listingFlagService.findOne(
            {listing: new ObjectId(listingRef), user: actionUserCtx.userId, company: company._id},
            {session, logger, languageCode},
        );
        if (existing) {
            throw apiValidationException("already_flagged", null, null, languageCode);
        }

        return {
            listing: new ObjectId(listingRef),
            user: actionUserCtx.userId,
            reason,
            comment: comment?.trim() || undefined,
        };
    },
    /** Edit report content only; status changes go through resolve/dismiss actions. */
    buildUpdateData: async ({reason, comment, actionUserCtx, languageCode, session, logger, company, _id}, writeFields) => {
        const flag = await listingFlagService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const reporterId = (flag as any).user?._id?.toString?.() ?? (flag as any).user?.toString?.();
        const isOwner = reporterId === actionUserCtx.userId?.toString?.();
        if (!actionUserCtx.isAdmin && !isOwner) {
            throw apiValidationException("admin_only", null, null, languageCode);
        }

        if (flag.status !== "pending") {
            throw apiValidationException("listing_flag_cannot_edit_in_current_status", null, null, languageCode);
        }

        const update: Record<string, unknown> = {};
        if (reason !== undefined && writeFields.reason) {
            update.reason = reason;
        }
        if (comment !== undefined && writeFields.comment) {
            update.comment = typeof comment === "string" && comment.trim() ? comment.trim() : null;
        }
        return update;
    },
});
