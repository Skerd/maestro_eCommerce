import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";

export class ListingActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async activate(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;

        logger.start("Activating listing...");
        SchemaGuard.sanitizeFields(Listing, {status: {}}, "write", actionUserCtx, languageCode);

        await listingService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {logger, languageCode, session},
        );

        await listingService.updateByIdOrThrow(
            new ObjectId(_id),
            {status: "active"},
            {logger, languageCode, session, auditUserId: actionUserCtx.userId},
        );

        logger.finish("Listing activated!");
        return {message: "Listing successfully activated!"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async deactivate(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;

        logger.start("Deactivating listing...");
        SchemaGuard.sanitizeFields(Listing, {status: {}}, "write", actionUserCtx, languageCode);

        await listingService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {logger, languageCode, session},
        );

        await listingService.updateByIdOrThrow(
            new ObjectId(_id),
            {status: "inactive"},
            {logger, languageCode, session, auditUserId: actionUserCtx.userId},
        );

        logger.finish("Listing deactivated!");
        return {message: "Listing successfully deactivated!"};
    }
}