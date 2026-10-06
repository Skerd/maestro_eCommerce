import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {reorderCmsBlocksFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/reorderCmsBlocks.form.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import type {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import CmsBlockModel from "./cmsBlock";
import {cmsBlockService} from "./cmsBlock.service";

export class CmsBlockActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<ActionMessage> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<ActionMessage> {
        return setActiveState(params, false);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: reorderCmsBlocksFormSchema,
        transaction: true,
    })
    async reorder(params: AuthenticatedMWType & {orderedIds: string[]}): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, orderedIds} = params;

        const writeFields = SchemaGuard.sanitizeFields(
            CmsBlockModel,
            getModelCollectedData("cmsBlocks").writeFields!,
            "write",
            actionUserCtx,
            languageCode,
        );
        if (!writeFields.position) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
        }

        const existing = await cmsBlockService.find(
            {company: company._id},
            {session, logger, languageCode},
            undefined,
            "_id",
        );
        const ownedIds = new Set(existing.map((block) => block._id.toString()));
        const coversCompany = ownedIds.size === orderedIds.length && orderedIds.every((id) => ownedIds.has(id));
        if (!coversCompany) {
            throw apiValidationException("not_found", "", null, languageCode);
        }

        const result = await cmsBlockService.bulkUpdate(
            orderedIds.map((id, index) => ({
                id,
                update: {$set: {position: index}},
            })),
            {session, logger, languageCode},
        );
        if (result.matchedCount !== orderedIds.length) {
            throw apiValidationException("not_found", "", null, languageCode);
        }

        return {message: "Blocks reordered successfully"};
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<ActionMessage> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        CmsBlockModel,
        getModelCollectedData("cmsBlocks").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }

    const existing = await cmsBlockService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return {message: isActive ? "CMS block already active" : "CMS block already inactive"};
    }

    await cmsBlockService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return {message: isActive ? "CMS block activated" : "CMS block deactivated"};
}
