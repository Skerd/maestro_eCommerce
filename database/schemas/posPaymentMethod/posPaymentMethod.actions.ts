import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {
    PosPaymentMethod as PosPaymentMethodDto,
    TestPosTerminalConnectionResponse,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.dto";
import {posPaymentMethodToDTO} from "@eCommerceModule/utilities/mappers/posPaymentMethod/posPaymentMethodMapper.dto";
import {testPosTerminalConnection} from "@eCommerceModule/utilities/services/posTerminalConnection";
import {detachPosPaymentMethodFromConfigs} from "@eCommerceModule/utilities/services/posPaymentMethodDetach";
import PosPaymentMethodModel from "./posPaymentMethod";
import {posPaymentMethodService} from "./posPaymentMethod.service";

export class PosPaymentMethodActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        schema: validateSingleForm,
    })
    async testConnection(params: Record<string, any>): Promise<TestPosTerminalConnectionResponse> {
        const {logger, languageCode, company, session, _id} = params;

        const method = await posPaymentMethodService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {logger, languageCode, session},
        );

        return testPosTerminalConnection(method, {languageCode, logger});
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<PosPaymentMethodDto> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<PosPaymentMethodDto> {
        return setActiveState(params, false);
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<PosPaymentMethodDto> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = SchemaGuard.sanitizeFields(
        PosPaymentMethodModel,
        COLLECTED_DATA.pospaymentmethods.writeFields,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", null, null, languageCode);
    }

    const existing = await posPaymentMethodService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return posPaymentMethodToDTO(existing);
    }

    // Deactivating also detaches from POS configs (same last-method guard as delete).
    if (!isActive) {
        await detachPosPaymentMethodFromConfigs(existing._id, {
            companyId: company._id,
            languageCode,
            session,
        });
    }

    const updated = await posPaymentMethodService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return posPaymentMethodToDTO(updated);
}
