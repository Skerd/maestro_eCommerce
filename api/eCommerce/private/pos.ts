import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {chargePosTerminalFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/chargePosTerminal.form.validator";
import type {ChargePosTerminalFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/chargePosTerminal.form.validator";
import {
    posCatalogFormSchema,
    posCurrentSessionFormSchema,
    posCustomerSearchFormSchema,
    posSessionIdFormSchema,
    posSessionOrdersFormSchema,
    verifyPosManagerPinFormSchema,
    type PosCatalogFormType,
    type PosCurrentSessionFormType,
    type PosCustomerSearchFormType,
    type PosSessionIdFormType,
    type PosSessionOrdersFormType,
    type VerifyPosManagerPinFormType,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/pos/posTill.form.validator";
import {chargePosTerminal, getCurrentPosSession, loadPosCatalog} from "@eCommerceModule/utilities/services/posService";
import {assertPosOrderWrite} from "@eCommerceModule/database/schemas/posOrder/posOrder.actions";
import {listHeldPosOrders, listSessionPosOrders, searchPosCustomers, verifyPosManagerPin} from "@eCommerceModule/utilities/services/posTillOps";

export const basePath = "/api/eCommerce/pos";
export const router = Router();

function tillCtx(params: AuthenticatedMWType & any) {
    return {
        logger: params.logger,
        languageCode: params.languageCode,
        company: params.company,
        userId: new ObjectId(params.actionUserCtx.userId),
    };
}

router.post(
    "/catalog",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(posCatalogFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosCatalogFormType) => {
        assertPosOrderWrite(params, "state");
        return loadPosCatalog(
            {
                search: params.search,
                categoryId: params.categoryId,
                barcode: params.barcode,
                page: params.page,
                limit: params.limit,
                warehouseId: params.warehouseId,
                configId: params.configId,
            },
            tillCtx(params),
        );
    }),
);

router.post(
    "/currentSession",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(posCurrentSessionFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosCurrentSessionFormType) => {
        assertPosOrderWrite(params, "state");
        const data = await getCurrentPosSession(params.configId, tillCtx(params));
        return {data};
    }),
);

router.post(
    "/held",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(posSessionIdFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosSessionIdFormType) => {
        assertPosOrderWrite(params, "state");
        const data = await listHeldPosOrders(params.sessionId, tillCtx(params));
        return {data};
    }),
);

router.post(
    "/orders",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(posSessionOrdersFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosSessionOrdersFormType) => {
        assertPosOrderWrite(params, "state");
        const data = await listSessionPosOrders(params.sessionId, tillCtx(params), {
            state: params.state,
            limit: params.limit,
        });
        return {data};
    }),
);

router.post(
    "/customers",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(posCustomerSearchFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosCustomerSearchFormType) => {
        assertPosOrderWrite(params, "state");
        const data = await searchPosCustomers(params.query ?? params.search, tillCtx(params));
        return {data};
    }),
);

router.post(
    "/verifyPin",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(verifyPosManagerPinFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & VerifyPosManagerPinFormType) => {
        assertPosOrderWrite(params, "state");
        const data = await verifyPosManagerPin(
            params.configId,
            params.pin,
            tillCtx(params),
            params.managerId,
        );
        return {data};
    }),
);

router.post(
    "/chargeTerminal",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 40}),
    validateFormZod(chargePosTerminalFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & ChargePosTerminalFormType) => {
        assertPosOrderWrite(params, "state");
        const data = await chargePosTerminal(
            {
                sessionId: params.sessionId,
                paymentMethodId: params.paymentMethodId,
                amount: params.amount,
                currency: params.currency,
                reference: params.reference,
            },
            tillCtx(params),
        );
        return {data};
    }),
);
