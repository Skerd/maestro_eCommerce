import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {FiscalConfig as FiscalConfigDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.dto";
import {fiscalConfigToDTO} from "@eCommerceModule/utilities/mappers/fiscalConfigMapper.dto";
import FiscalConfigModel from "./fiscalConfig";
import {fiscalConfigService} from "./fiscalConfig.service";

export class FiscalConfigActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<FiscalConfigDto> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<FiscalConfigDto> {
        return setActiveState(params, false);
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<FiscalConfigDto> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        FiscalConfigModel,
        COLLECTED_DATA.fiscalconfigs.writeFields,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", null, null, languageCode);
    }

    const existing = await fiscalConfigService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return fiscalConfigToDTO(existing);
    }

    const updated = await fiscalConfigService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return fiscalConfigToDTO(updated);
}
