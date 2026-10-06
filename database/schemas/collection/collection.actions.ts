import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import ProductCollection from "./collection";
import {collectionService} from "./collection.service";

export class CollectionActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<ActionMessage> {
        return setVisibleState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<ActionMessage> {
        return setVisibleState(params, false);
    }
}

async function setVisibleState(params: Record<string, any>, isVisible: boolean): Promise<ActionMessage> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        ProductCollection,
        getModelCollectedData("productCollections").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isVisible) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }

    const existing = await collectionService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isVisible === isVisible) {
        return {message: isVisible ? "Collection already visible" : "Collection already hidden"};
    }

    await collectionService.updateByIdOrThrow(
        existing._id,
        {isVisible},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return {message: isVisible ? "Collection activated" : "Collection deactivated"};
}
