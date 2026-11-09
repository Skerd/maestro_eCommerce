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
import {recordPosOrderFiscalCodesFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/resolvePosOrderFiscal.form.validator";
import type {RecordPosOrderFiscalCodesFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/resolvePosOrderFiscal.form.validator";
import {payAndFiscalizePosOrder, refundPosOrder, sendPosOrderToCis} from "@eCommerceModule/workflows/posService";
import {fiscalConfigIdForPosConfig} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {deleteHeldPosOrder, holdPosOrder, reprintPosOrder} from "@eCommerceModule/workflows/posTillOps";
import PosOrderModel from "./posOrder";
import {posOrderService} from "./posOrder.service";

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

/**
 * A sale sent to CIS whose answer was not stored: marked, with no codes, so it may be registered (TD-B75). Only such a
 * sale is resolved by hand, after staff check the CIS portal (D98).
 */
const AWAITING_CIS_CONFIRMATION = {fiscalRegisteringAt: {$ne: null}, nslf: null, nivf: null};
const POS_ORDER_POPULATE = "session config cashier customer payments.paymentMethod fiscalResolvedBy";

/** The sale, refused unless it awaits a CIS portal check: one already resolved (or never lost) is never resolved again. */
async function loadOrderAwaitingCisConfirmation(params: AuthenticatedMWType & {_id: string; session?: TransactionRequiredParams["session"]}) {
    const {languageCode, session} = params;
    const order = await posOrderService.findOne(
        {_id: new ObjectId(params._id), company: new ObjectId(params.actionUserCtx.orgId)},
        {session, withDeleted: false},
        undefined,
        "+fiscalRegisteringAt",
    );
    if (!order) throw apiValidationException("pos_order_not_found", "_id", null, languageCode);
    if (!order.fiscalRegisteringAt || order.nslf || order.nivf) {
        throw apiValidationException("fiscal_not_awaiting_confirmation", "_id", null, languageCode);
    }
    return order;
}

/**
 * Resolves a sale awaiting a CIS portal check in one conditional write, which also records who resolved it, when and
 * how (D98). A concurrent resolution, or the CIS answer arriving meanwhile, leaves nothing to match: refused.
 */
async function resolveCisConfirmation(
    params: AuthenticatedMWType & {_id: string; session?: TransactionRequiredParams["session"]},
    update: {$set: Record<string, unknown>; $unset: Record<string, 1>},
): Promise<void> {
    const company = new ObjectId(params.actionUserCtx.orgId);
    const resolved = await posOrderService.updateOne(
        {_id: new ObjectId(params._id), company, ...AWAITING_CIS_CONFIRMATION},
        {
            $set: {...update.$set, fiscalResolvedBy: new ObjectId(params.actionUserCtx.userId), fiscalResolvedAt: new Date()},
            $unset: {...update.$unset, fiscalRegisteringAt: 1},
        },
        {session: params.session},
    );
    if (!resolved.matchedCount) throw apiValidationException("fiscal_not_awaiting_confirmation", "_id", null, params.languageCode);
}

async function posOrderDTO(params: AuthenticatedMWType & {_id: string; session?: TransactionRequiredParams["session"]}) {
    const order = await posOrderService.findByIdOrThrow(params._id, {session: params.session, languageCode: params.languageCode}, POS_ORDER_POPULATE);
    return posOrderToDTO(order);
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

    /** Owns its transaction: the sale commits before CIS is called (D97). */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        schema: payPosOrderFormSchema,
    })
    async pay(params: AuthenticatedMWType & PayPosOrderFormType) {
        assertPosOrderWrite(params, "state");
        const data = await payAndFiscalizePosOrder(
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

    /**
     * "Record CIS codes" (D98): the sale was registered, as the CIS portal shows. The codes found there become its
     * fiscal result, as `fiscalizePosOrder` stores CIS's answer; the request it sent was never stored, so nothing else of
     * that answer is known. It was registered when it was sent.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: recordPosOrderFiscalCodesFormSchema,
    })
    async recordFiscalCodes(params: TransactionRequiredParams & RecordPosOrderFiscalCodesFormType) {
        const order = await loadOrderAwaitingCisConfirmation(params);
        const fiscalConfigId = await fiscalConfigIdForPosConfig(new ObjectId(params.actionUserCtx.orgId), order.config);
        const now = new Date();
        await resolveCisConfirmation(params, {
            $set: {
                // The till stores the NSLF (IIC) in capitals, as it computes it
                nslf: params.nslf.toUpperCase(),
                nivf: params.nivf,
                ...(params.eic ? {eic: params.eic, einvoiceAt: now} : {}),
                ...(fiscalConfigId ? {fiscalConfig: new ObjectId(fiscalConfigId)} : {}),
                fiscalizedAt: order.fiscalRegisteringAt,
                fiscalResolution: "recorded",
            },
            $unset: {fiscalError: 1},
        });
        return {data: {order: await posOrderDTO(params)}};
    }

    /**
     * "Not registered, send again" (D98): the CIS portal does not show the sale. The mark is cleared and the sale is
     * sent the way the manual send does. Owns no transaction: CIS is called outside one (D97).
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
    })
    async resendFiscal(params: AuthenticatedMWType & {_id: string}) {
        await loadOrderAwaitingCisConfirmation(params);
        await resolveCisConfirmation(params, {$set: {fiscalResolution: "resent"}, $unset: {}});
        const {languageCode, company} = tillCtx(params);
        const fiscal = await sendPosOrderToCis(params._id, {languageCode, company});
        return {data: {...fiscal, order: await posOrderDTO(params)}};
    }
}
