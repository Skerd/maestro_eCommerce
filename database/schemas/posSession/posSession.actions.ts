import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import type {UserContext} from "@coreModule/utilities/types/types";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {openPosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/openPosSession.form.validator";
import type {OpenPosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/openPosSession.form.validator";
import {cashMovePosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/cashMovePosSession.form.validator";
import type {CashMovePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/cashMovePosSession.form.validator";
import {closePosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/closePosSession.form.validator";
import type {ClosePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/closePosSession.form.validator";
import {reconcilePosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/reconcilePosSession.form.validator";
import type {ReconcilePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/reconcilePosSession.form.validator";
import {cashMovePosSession, closePosSession, openPosSession} from "@eCommerceModule/utilities/services/posService";
import {getPosSessionReconciliation} from "@eCommerceModule/utilities/services/posTillOps";
import PosSessionModel from "./posSession";

/**
 * Session lifecycle and cash-drawer moves are gated on the session's field write
 * tags: `possessions[write:state]` to open, close and reconcile, and
 * `possessions[write:cashMoves]` for cash in/out. Admin roles receive both at boot.
 */
function assertPosSessionWrite(
    params: {languageCode: string; actionUserCtx: UserContext},
    field: "state" | "cashMoves",
): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        PosSessionModel,
        getModelCollectedData("posSessions").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields[field]) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

function tillCtx(params: AuthenticatedMWType & {session?: TransactionRequiredParams["session"]}) {
    return {
        logger: params.logger,
        languageCode: params.languageCode,
        company: {
            _id: new ObjectId(params.actionUserCtx.orgId),
            name: params.company.name,
        },
        userId: new ObjectId(params.actionUserCtx.userId),
        session: params.session,
    };
}

export class PosSessionActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: openPosSessionFormSchema,
    })
    async open(params: TransactionRequiredParams & OpenPosSessionFormType) {
        assertPosSessionWrite(params, "state");
        const data = await openPosSession(
            {
                configId: params.configId,
                openingBalance: params.openingBalance,
                notes: params.notes,
            },
            tillCtx(params),
        );
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 40},
        transaction: true,
        schema: cashMovePosSessionFormSchema,
    })
    async cashMove(params: TransactionRequiredParams & CashMovePosSessionFormType) {
        assertPosSessionWrite(params, "cashMoves");
        const data = await cashMovePosSession(
            {
                _id: params._id,
                type: params.type,
                amount: params.amount,
                reason: params.reason,
                managerPin: params.managerPin,
                managerId: params.managerId,
            },
            tillCtx(params),
        );
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: closePosSessionFormSchema,
    })
    async close(params: TransactionRequiredParams & ClosePosSessionFormType) {
        assertPosSessionWrite(params, "state");
        const data = await closePosSession(
            {
                _id: params._id,
                closingBalance: params.closingBalance,
                notes: params.notes,
                differenceReason: params.differenceReason,
            },
            tillCtx(params),
        );
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        schema: reconcilePosSessionFormSchema,
    })
    async reconciliation(params: AuthenticatedMWType & ReconcilePosSessionFormType) {
        assertPosSessionWrite(params, "state");
        const data = await getPosSessionReconciliation(
            params.sessionId,
            tillCtx(params),
            params.countedCash,
        );
        return {data};
    }
}
