import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ServerError} from "armonia/src/modules/core/types";
import {
    getTaxpayerFormSchema,
    posOrderFiscalFormSchema,
    type GetTaxpayerFormType,
    type PosOrderFiscalFormType,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscal/fiscal.form.validator";
import {getTaxpayer, loadFiscalConfigWithCert} from "@financeModule/utilities/fiscalization/fiscalizationService";
import {fiscalConfigIdForPosConfig, registerEinvoiceForPosOrder} from "@eCommerceModule/utilities/fiscalization/posFiscalization";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {sendPosOrderToCis} from "@eCommerceModule/workflows/posService";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {assertPosOrderWrite} from "@eCommerceModule/database/schemas/posOrder/posOrder.actions";
import {fiscalComingSoon} from "@financeModule/utilities/middlewares/fiscalComingSoon";

export const basePath = "/api/eCommerce/fiscal";
export const router = Router();
// The till and fiscalization wait for certification (D186)
router.use(fiscalComingSoon);

router.post(
    "/fiscalizePosOrder",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(posOrderFiscalFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosOrderFiscalFormType) => {
        assertPosOrderWrite(params, "state");
        const {company, languageCode, posOrderId, fiscalConfigId} = params;
        // The request's company, as the till actions pass it (posOrder.actions.ts `tillCtx`)
        const owner = {_id: new ObjectId(params.actionUserCtx.orgId), name: company.name, vat: company.vat};
        return {data: await sendPosOrderToCis(posOrderId, {languageCode, company: owner}, fiscalConfigId)};
    }),
);

router.post(
    "/registerEinvoice",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(posOrderFiscalFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & PosOrderFiscalFormType) => {
        assertPosOrderWrite(params, "state");
        const {company, languageCode, posOrderId, fiscalConfigId} = params;
        const order = await posOrderService.findOne({_id: posOrderId, company: company._id}, {withDeleted: false}, undefined, "+iicSignature");
        if (!order) throw apiValidationException("pos_order_not_found", "posOrderId", null, languageCode);
        const resolvedFiscalConfigId = fiscalConfigId ?? await fiscalConfigIdForPosConfig(company._id, order.config);
        const config = await loadFiscalConfigWithCert(company._id, resolvedFiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await registerEinvoiceForPosOrder(order, config, {
                languageCode,
                companyVat: company.vat,
                companyName: company.name,
            });
            if (result.eic) {
                order.eic = result.eic;
                order.einvoiceAt = new Date();
                order.ublXml = result.ublXml;
                order.fiscalError = undefined;
            } else {
                order.fiscalError = result.fault;
            }
            await order.save();
            return {
                data: {
                    order: posOrderToDTO(order),
                    eic: result.eic,
                    fault: result.fault,
                },
            };
        } catch (e: unknown) {
            if (e instanceof ServerError) throw e;
            throw apiValidationException("fiscal_einvoice_error", "posOrderId", null, languageCode, [e instanceof Error ? e.message : String(e)]);
        }
    }),
);

router.post(
    "/getTaxpayer",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(getTaxpayerFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & GetTaxpayerFormType) => {
        assertPosOrderWrite(params, "state");
        const {company, languageCode, fiscalConfigId, tin} = params;
        const config = await loadFiscalConfigWithCert(company._id, fiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await getTaxpayer(config, tin, languageCode);
            return {data: result};
        } catch (e: unknown) {
            if (e instanceof ServerError) throw e;
            throw apiValidationException("fiscal_taxpayer_error", "tin", null, languageCode, [e instanceof Error ? e.message : String(e)]);
        }
    }),
);
