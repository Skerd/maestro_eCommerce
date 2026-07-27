import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {PricingRule as PricingRuleDto} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.dto";
import {pricingRuleToDTOWithLabels} from "@eCommerceModule/utilities/mappers/pricingRule/pricingRuleMapper.dto";
import PricingRuleModel from "./pricingRule";
import {pricingRuleService} from "./pricingRule.service";

export class PricingRuleActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<PricingRuleDto> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<PricingRuleDto> {
        return setActiveState(params, false);
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<PricingRuleDto> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        PricingRuleModel,
        getModelCollectedData("pricingRules").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", null, null, languageCode);
    }

    const existing = await pricingRuleService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return pricingRuleToDTOWithLabels(existing);
    }

    const updated = await pricingRuleService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return pricingRuleToDTOWithLabels(updated);
}
