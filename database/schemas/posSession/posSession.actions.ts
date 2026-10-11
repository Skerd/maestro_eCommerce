import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
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
        const data = await getPosSessionReconciliation(
            params.sessionId,
            tillCtx(params),
            params.countedCash,
        );
        return {data};
    }
}
