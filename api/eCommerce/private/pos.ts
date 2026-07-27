import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {payPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/payPosOrder.form.validator";
import {refundPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/refundPosOrder.form.validator";
import {cashMovePosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/cashMovePosSession.form.validator";
import {closePosSessionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/closePosSession.form.validator";
import {holdPosOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/holdPosOrder.form.validator";
import {z} from "zod";
import {isObjectIdZod, greaterThanOrEqualZod} from "armonia/src/modules/core/helpers/zodBuilder";
import {
    openPosSession,
    getCurrentPosSession,
    cashMovePosSession,
    closePosSession,
    loadPosCatalog,
    payPosOrder,
    refundPosOrder,
    chargePosTerminal,
} from "@eCommerceModule/utilities/services/posService";
import {
    holdPosOrder,
    listHeldPosOrders,
    deleteHeldPosOrder,
    listSessionPosOrders,
    reprintPosOrder,
    getPosSessionReconciliation,
    searchPosCustomers,
    verifyPosManagerPin,
} from "@eCommerceModule/utilities/services/posTillOps";
import {chargePosTerminalFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/chargePosTerminal.form.validator";

export const basePath = "/api/eCommerce/pos";
export const router = Router();

function openSessionFormSchema(languageCode: string, form: any = null) {
    return z.object({
        configId: isObjectIdZod(form?.["configIdLabel"] ?? "configId", languageCode),
        openingBalance: greaterThanOrEqualZod(form?.["openingBalanceLabel"] ?? "openingBalance", 0, languageCode).optional(),
        notes: z.string().max(2000).optional(),
    });
}

function sessionIdFormSchema(languageCode: string, form: any = null) {
    return z.object({
        sessionId: isObjectIdZod(form?.["sessionIdLabel"] ?? "sessionId", languageCode),
    });
}

function idFormSchema(languageCode: string, form: any = null) {
    return z.object({
        _id: isObjectIdZod(form?.["_idLabel"] ?? "_id", languageCode),
    });
}

function reconciliationFormSchema(languageCode: string, form: any = null) {
    return z.object({
        sessionId: isObjectIdZod(form?.["sessionIdLabel"] ?? "sessionId", languageCode),
        countedCash: greaterThanOrEqualZod(form?.["countedCashLabel"] ?? "countedCash", 0, languageCode).optional(),
    });
}

router.post(
    "/catalog",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (params: any) => {
        const {
            logger,
            languageCode,
            company,
            actionUserCtx,
            search,
            categoryId,
            barcode,
            page,
            limit,
            warehouseId,
            configId,
        } = params;
        return loadPosCatalog(
            {search, categoryId, barcode, page, limit, warehouseId, configId},
            {logger, languageCode, company, userId: actionUserCtx.userId},
        );
    }),
);

router.post(
    "/currentSession",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, configId} = params;
        const data = await getCurrentPosSession(configId, {
            logger,
            languageCode,
            company,
            userId: actionUserCtx.userId,
        });
        return {data};
    }),
);

router.post(
    "/openSession",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    transactionHandler(),
    validateFormZod(openSessionFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, configId, openingBalance, notes} = params;
        const data = await openPosSession(
            {configId, openingBalance, notes},
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
                session,
            },
        );
        return {data};
    }),
);

router.post(
    "/cashMove",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 40}),
    transactionHandler(),
    validateFormZod(cashMovePosSessionFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, _id, type, amount, reason, managerPin, managerId} =
            params;
        const data = await cashMovePosSession(
            {_id, type, amount, reason, managerPin, managerId},
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
                session,
            },
        );
        return {data};
    }),
);

router.post(
    "/closeSession",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    transactionHandler(),
    validateFormZod(closePosSessionFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, _id, closingBalance, notes, differenceReason} =
            params;
        const data = await closePosSession(
            {_id, closingBalance, notes, differenceReason},
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
                session,
            },
        );
        return {data};
    }),
);

router.post(
    "/reconciliation",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(reconciliationFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, sessionId, countedCash} = params;
        const data = await getPosSessionReconciliation(
            sessionId,
            {logger, languageCode, company, userId: actionUserCtx.userId},
            countedCash != null ? Number(countedCash) : undefined,
        );
        return {data};
    }),
);

router.post(
    "/hold",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    transactionHandler(),
    validateFormZod(holdPosOrderFormSchema),
    asyncHandler(async (params: any) => {
        const {
            logger,
            languageCode,
            company,
            actionUserCtx,
            session,
            sessionId,
            _id,
            customerId,
            customerName,
            note,
            discountPercent,
            lines,
        } = params;
        const data = await holdPosOrder(
            {sessionId, _id, customerId, customerName, note, discountPercent, lines},
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
                session,
            },
        );
        return {data};
    }),
);

router.post(
    "/held",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(sessionIdFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, sessionId} = params;
        const data = await listHeldPosOrders(sessionId, {
            logger,
            languageCode,
            company,
            userId: actionUserCtx.userId,
        });
        return {data};
    }),
);

router.post(
    "/held/delete",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 40}),
    transactionHandler(),
    validateFormZod(idFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, _id} = params;
        const data = await deleteHeldPosOrder(_id, {
            logger,
            languageCode,
            company,
            userId: new ObjectId(actionUserCtx.userId.toString()),
            session,
        });
        return {data};
    }),
);

router.post(
    "/orders",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(sessionIdFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, sessionId, state, limit} = params;
        const data = await listSessionPosOrders(
            sessionId,
            {logger, languageCode, company, userId: actionUserCtx.userId},
            {state, limit},
        );
        return {data};
    }),
);

router.post(
    "/reprint",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 40}),
    validateFormZod(idFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, _id} = params;
        const data = await reprintPosOrder(_id, {
            logger,
            languageCode,
            company,
            userId: actionUserCtx.userId,
        });
        return {data};
    }),
);

router.post(
    "/customers",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, query, search} = params;
        const data = await searchPosCustomers(query ?? search, {
            logger,
            languageCode,
            company,
            userId: actionUserCtx.userId,
        });
        return {data};
    }),
);

router.post(
    "/verifyPin",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, configId, pin, managerId} = params;
        if (!configId || !pin) {
            return {data: {ok: false}};
        }
        const data = await verifyPosManagerPin(String(configId), String(pin), {
            logger,
            languageCode,
            company,
            userId: actionUserCtx.userId,
        }, managerId ? String(managerId) : undefined);
        return {data};
    }),
);

router.post(
    "/chargeTerminal",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 40}),
    validateFormZod(chargePosTerminalFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, sessionId, paymentMethodId, amount, currency, reference} =
            params;
        const data = await chargePosTerminal(
            {sessionId, paymentMethodId, amount, currency, reference},
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
            },
        );
        return {data};
    }),
);

router.post(
    "/pay",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    transactionHandler(),
    validateFormZod(payPosOrderFormSchema),
    asyncHandler(async (params: any) => {
        const {
            logger,
            languageCode,
            company,
            actionUserCtx,
            session,
            sessionId,
            customerId,
            customerName,
            note,
            discountPercent,
            lines,
            payments,
            heldOrderId,
            clientRequestId,
            managerPin,
            managerId,
        } = params;
        const data = await payPosOrder(
            {
                sessionId,
                customerId,
                customerName,
                note,
                discountPercent,
                lines,
                payments,
                heldOrderId,
                clientRequestId,
                managerPin,
                managerId,
            },
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
                session,
            },
        );
        return {data};
    }),
);

router.post(
    "/refund",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    transactionHandler(),
    validateFormZod(refundPosOrderFormSchema),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, company, actionUserCtx, session, _id, reason, amount, lines, managerPin, managerId} =
            params;
        const data = await refundPosOrder(
            {_id, reason, amount, lines, managerPin, managerId},
            {
                logger,
                languageCode,
                company,
                userId: new ObjectId(actionUserCtx.userId.toString()),
                session,
            },
        );
        return {data};
    }),
);
