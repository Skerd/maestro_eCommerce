import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import type {TestPosTerminalConnectionResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.dto";
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
        // Probing a terminal calls out to its configured address: payment-method managers only
        assertCanWriteActive(params);

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
}

function assertCanWriteActive(params: Record<string, any>): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        PosPaymentMethodModel,
        getModelCollectedData("posPaymentMethods").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<ActionMessage> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    assertCanWriteActive(params);

    const existing = await posPaymentMethodService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return {message: isActive ? "POS payment method already active" : "POS payment method already inactive"};
    }

    // Deactivating also detaches from POS configs (same last-method guard as delete).
    if (!isActive) {
        await detachPosPaymentMethodFromConfigs(existing._id, {
            companyId: company._id,
            languageCode,
            session,
        });
    }

    await posPaymentMethodService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    return {message: isActive ? "POS payment method activated" : "POS payment method deactivated"};
}
