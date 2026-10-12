import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import type {UserContext} from "@coreModule/utilities/types/types";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {holdPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/holdPosOrder.form.validator";
import type {HoldPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/holdPosOrder.form.validator";
import {payPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/payPosOrder.form.validator";
import type {PayPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/payPosOrder.form.validator";
import {refundPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/refundPosOrder.form.validator";
import type {RefundPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/refundPosOrder.form.validator";
import {payPosOrder, refundPosOrder} from "@eCommerceModule/utilities/services/posService";
import {deleteHeldPosOrder, holdPosOrder, reprintPosOrder} from "@eCommerceModule/utilities/services/posTillOps";
import PosOrderModel from "./posOrder";

/**
 * Till operations write system-managed POS fields, so they are gated on those
 * fields' write tags: `posorders[write:state]` to ring up sales (and every till
 * read that goes with it), `posorders[write:amountRefunded]` to refund. Admin
 * roles receive both at boot; cashier roles must be granted them.
 */
export function assertPosOrderWrite(
    params: {languageCode: string; actionUserCtx: UserContext},
    field: "state" | "amountRefunded",
): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        PosOrderModel,
        getModelCollectedData("posOrders").writeFields!,
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
            vat: params.company.vat,
        },
        userId: new ObjectId(params.actionUserCtx.userId),
        session: params.session,
    };
}

export class PosOrderActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: true,
        schema: holdPosOrderFormSchema,
    })
    async hold(params: TransactionRequiredParams & HoldPosOrderFormType) {
        assertPosOrderWrite(params, "state");
        const data = await holdPosOrder(
            {
                sessionId: params.sessionId,
                _id: params._id,
                customerId: params.customerId,
                customerName: params.customerName,
                note: params.note,
                discountPercent: params.discountPercent,
                lines: params.lines,
            },
            tillCtx(params),
        );
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: true,
        schema: payPosOrderFormSchema,
    })
    async pay(params: TransactionRequiredParams & PayPosOrderFormType) {
        assertPosOrderWrite(params, "state");
        const data = await payPosOrder(
            {
                sessionId: params.sessionId,
                customerId: params.customerId,
                customerName: params.customerName,
                note: params.note,
                discountPercent: params.discountPercent,
                lines: params.lines,
                payments: params.payments,
                heldOrderId: params.heldOrderId,
                clientRequestId: params.clientRequestId,
                managerPin: params.managerPin,
                managerId: params.managerId,
            },
            tillCtx(params),
        );
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: refundPosOrderFormSchema,
    })
    async refund(params: TransactionRequiredParams & RefundPosOrderFormType) {
        assertPosOrderWrite(params, "amountRefunded");
        const data = await refundPosOrder(
            {
                _id: params._id,
                reason: params.reason,
                amount: params.amount,
                lines: params.lines,
                managerPin: params.managerPin,
                managerId: params.managerId,
            },
            tillCtx(params),
        );
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 40},
        schema: validateSingleForm,
    })
    async reprint(params: AuthenticatedMWType & {_id: string}) {
        assertPosOrderWrite(params, "state");
        const data = await reprintPosOrder(params._id, tillCtx(params));
        return {data};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 40},
        transaction: true,
        schema: validateSingleForm,
    })
    async deleteHeld(params: TransactionRequiredParams & {_id: string}) {
        assertPosOrderWrite(params, "state");
        const data = await deleteHeldPosOrder(params._id, tillCtx(params));
        return {data};
    }
}
