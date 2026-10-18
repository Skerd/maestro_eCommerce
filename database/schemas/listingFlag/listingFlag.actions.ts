import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {resolveListingFlagActionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingFlag/resolveListingFlag.action.validator";
import {apiValidationException, DEFAULT_EXCEPTION_LANGUAGE} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {listingFlagService} from "@eCommerceModule/database/schemas/listingFlag/listingFlag.service";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";

function ensureAdmin(actionUserCtx: Record<string, any>, languageCode: string | undefined): void {
    if (!actionUserCtx.isAdmin) {
        throw apiValidationException("admin_only", null, null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
    }
}

async function maybeDeactivateListing(
    listingRef: unknown,
    listingAction: unknown,
    params: Record<string, any>,
): Promise<void> {
    if (listingAction !== "deactivate") return;

    const {session, logger, languageCode, actionUserCtx, company} = params;
    const listingId = (listingRef as any)?._id ?? listingRef;
    if (!listingId) return;

    const listing = await listingService.findById(
        new ObjectId(String(listingId)),
        {session, logger, languageCode},
        "",
        "_id company",
    );
    const listingCompanyId = (listing as any)?.company?._id ?? (listing as any)?.company;
    if (!listing || listingCompanyId?.toString?.() !== company._id.toString()) {
        return;
    }

    await listingService.updateById(
        new ObjectId(String(listingId)),
        {$set: {status: "inactive"}},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: true},
    );
}

export class ListingFlagActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: resolveListingFlagActionFormSchema,
    })
    async resolve(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, resolution, listingAction} = params;

        logger.start(`Resolving listing flag: ${_id}...`);
        ensureAdmin(actionUserCtx, languageCode);

        const flag = await listingFlagService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if ((flag as any).deletedAt) {
            throw apiValidationException("listing_flag_deleted", null, null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        if (flag.status !== "pending") {
            throw apiValidationException(
                "listing_flag_cannot_resolve_in_current_status",
                null,
                null,
                languageCode ?? DEFAULT_EXCEPTION_LANGUAGE,
            );
        }

        const resolutionText = typeof resolution === "string" ? resolution.trim() : "";
        if (!resolutionText) {
            throw apiValidationException("validation_required", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await listingFlagService.updateByIdOrThrow(
            flag._id,
            {$set: {status: "reviewed", resolution: resolutionText}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await maybeDeactivateListing((flag as any).listing, listingAction, params);

        logger.finish(`Resolved listing flag: ${_id}`);
        return {message: "Listing flag resolved"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: resolveListingFlagActionFormSchema,
    })
    async dismiss(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, resolution} = params;

        logger.start(`Dismissing listing flag: ${_id}...`);
        ensureAdmin(actionUserCtx, languageCode);

        const flag = await listingFlagService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if ((flag as any).deletedAt) {
            throw apiValidationException("listing_flag_deleted", null, null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        if (flag.status !== "pending") {
            throw apiValidationException(
                "listing_flag_cannot_dismiss_in_current_status",
                null,
                null,
                languageCode ?? DEFAULT_EXCEPTION_LANGUAGE,
            );
        }

        const resolutionText = typeof resolution === "string" ? resolution.trim() : "";
        if (!resolutionText) {
            throw apiValidationException("validation_required", "", null, languageCode ?? DEFAULT_EXCEPTION_LANGUAGE);
        }

        await listingFlagService.updateByIdOrThrow(
            flag._id,
            {$set: {status: "dismissed", resolution: resolutionText}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Dismissed listing flag: ${_id}`);
        return {message: "Listing flag dismissed"};
    }
}
