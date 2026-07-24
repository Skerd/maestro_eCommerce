import {Router} from "express";
import {z} from "zod";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {isObjectIdZod, notEmptyZod} from "armonia/src/modules/core/helpers/zodBuilder";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {
    fiscalizePosOrder,
    getTaxpayer,
    loadFiscalConfigWithCert,
    registerEinvoiceForPosOrder,
    registerTcr,
} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrderMapper.dto";
import {fiscalConfigToDTO} from "@eCommerceModule/utilities/mappers/fiscalConfigMapper.dto";
import FiscalConfig from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";

export const basePath = "/api/eCommerce/fiscal";
export const router = Router();

function fiscalizeFormSchema(languageCode: string, form: any = null) {
    return z.object({
        posOrderId: isObjectIdZod(form?.["posOrderIdLabel"] ?? "posOrderId", languageCode),
        fiscalConfigId: isObjectIdZod(form?.["fiscalConfigIdLabel"] ?? "fiscalConfigId", languageCode).optional(),
        createEinvoice: z.boolean().optional(),
    });
}

function registerTcrFormSchema(languageCode: string, form: any = null) {
    return z.object({
        fiscalConfigId: isObjectIdZod(form?.["fiscalConfigIdLabel"] ?? "fiscalConfigId", languageCode),
        validFrom: z.string().optional(),
        validTo: z.string().optional(),
    });
}

function getTaxpayerFormSchema(languageCode: string, form: any = null) {
    return z.object({
        fiscalConfigId: isObjectIdZod(form?.["fiscalConfigIdLabel"] ?? "fiscalConfigId", languageCode),
        tin: notEmptyZod(form?.["tinLabel"] ?? "tin", languageCode).max(20),
    });
}

function einvoiceFormSchema(languageCode: string, form: any = null) {
    return z.object({
        posOrderId: isObjectIdZod(form?.["posOrderIdLabel"] ?? "posOrderId", languageCode),
        fiscalConfigId: isObjectIdZod(form?.["fiscalConfigIdLabel"] ?? "fiscalConfigId", languageCode).optional(),
    });
}

router.post(
    "/fiscalizePosOrder",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(fiscalizeFormSchema),
    asyncHandler(async (params: any) => {
        const {company, languageCode, posOrderId, fiscalConfigId, createEinvoice} = params;
        try {
            const result = await fiscalizePosOrder(posOrderId, company._id, {
                fiscalConfigId,
                companyVat: company.vat,
                companyName: company.name,
                createEinvoice,
            });
            return {
                data: {
                    order: posOrderToDTO(result.order),
                    nslf: result.invoice.nslf,
                    nivf: result.invoice.nivf,
                    eic: result.einvoice?.eic,
                    qrVerifyUrl: result.invoice.qrVerifyUrl,
                    fault: result.invoice.fault || result.einvoice?.fault,
                },
            };
        } catch (e: any) {
            throw apiValidationException("fiscal_error", "posOrderId", null, languageCode, [e?.message || String(e)]);
        }
    }),
);

router.post(
    "/registerEinvoice",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(einvoiceFormSchema),
    asyncHandler(async (params: any) => {
        const {company, languageCode, posOrderId, fiscalConfigId} = params;
        const order = await PosOrder.findOne({_id: posOrderId, company: company._id, deletedAt: null});
        if (!order) throw apiValidationException("pos_order_not_found", "posOrderId", null, languageCode);
        const config = await loadFiscalConfigWithCert(company._id, fiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await registerEinvoiceForPosOrder(order, config, {
                companyVat: company.vat,
                companyName: company.name,
            });
            if (result.eic) {
                (order as any).eic = result.eic;
                (order as any).einvoiceAt = new Date();
                (order as any).ublXml = result.ublXml;
                (order as any).fiscalError = undefined;
            } else {
                (order as any).fiscalError = result.fault;
            }
            await order.save();
            return {
                data: {
                    order: posOrderToDTO(order),
                    eic: result.eic,
                    fault: result.fault,
                },
            };
        } catch (e: any) {
            throw apiValidationException("fiscal_einvoice_error", "posOrderId", null, languageCode, [e?.message || String(e)]);
        }
    }),
);

router.post(
    "/registerTcr",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    validateFormZod(registerTcrFormSchema),
    asyncHandler(async (params: any) => {
        const {company, languageCode, fiscalConfigId, validFrom, validTo} = params;
        const config = await loadFiscalConfigWithCert(company._id, fiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await registerTcr(config, {
                companyVat: company.vat,
                validFrom,
                validTo,
            });
            const refreshed = await FiscalConfig.findById(config._id);
            return {
                data: {
                    tcrCode: result.tcrCode || refreshed?.tcrCode,
                    fault: result.fault,
                    config: refreshed ? fiscalConfigToDTO(refreshed) : undefined,
                },
            };
        } catch (e: any) {
            throw apiValidationException("fiscal_tcr_error", "fiscalConfigId", null, languageCode, [e?.message || String(e)]);
        }
    }),
);

router.post(
    "/getTaxpayer",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(getTaxpayerFormSchema),
    asyncHandler(async (params: any) => {
        const {company, languageCode, fiscalConfigId, tin} = params;
        const config = await loadFiscalConfigWithCert(company._id, fiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await getTaxpayer(config, tin);
            return {data: result};
        } catch (e: any) {
            throw apiValidationException("fiscal_taxpayer_error", "tin", null, languageCode, [e?.message || String(e)]);
        }
    }),
);
