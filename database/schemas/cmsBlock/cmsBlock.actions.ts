import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {CmsBlock as CmsBlockDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.dto";
import {cmsBlockToDTO} from "@eCommerceModule/utilities/mappers/cmsBlockMapper.dto";
import CmsBlockModel from "./cmsBlock";
import {cmsBlockService} from "./cmsBlock.service";

export class CmsBlockActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<CmsBlockDto> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<CmsBlockDto> {
        return setActiveState(params, false);
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<CmsBlockDto> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        CmsBlockModel,
        COLLECTED_DATA.cmsblocks.writeFields,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", null, null, languageCode);
    }

    const existing = await cmsBlockService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return cmsBlockToDTO(existing);
    }

    const updated = await cmsBlockService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return cmsBlockToDTO(updated);
}
