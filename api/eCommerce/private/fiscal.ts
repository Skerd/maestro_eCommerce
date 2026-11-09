import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ServerError} from "armonia/src/modules/core/types";
import {
    getTaxpayerFormSchema,
    posOrderFiscalFormSchema,
    registerTcrFormSchema,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscal/fiscal.form.validator";
import {
    financeInvoiceFiscalData,
    getTaxpayer,
    fiscalConfigIdForPosConfig,
    loadFiscalConfigWithCert,
    registerEinvoiceForPosOrder,
    registerFiscalInvoice,
    registerTcr,
} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {sendPosOrderToCis} from "@eCommerceModule/workflows/posService";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {fiscalConfigToDTO} from "@eCommerceModule/utilities/mappers/fiscalConfig/fiscalConfigMapper.dto";
import FiscalConfig from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import {fiscalConfigService} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.service";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {assertPosOrderWrite} from "@eCommerceModule/database/schemas/posOrder/posOrder.actions";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {invoiceService, registerInvoiceFiscalizer} from "@financeModule/database/schemas/invoice/invoice.service";

export const basePath = "/api/eCommerce/fiscal";
export const router = Router();

/**
 * Fiscalizes finance invoices (rental invoices and the like) with the company's
 * active fiscal config, through the same CIS registration as POS orders. A company
 * without one gets `null`: its invoices need no registration here.
 */
registerInvoiceFiscalizer(async (invoice, {languageCode}) => {
    const config = await loadFiscalConfigWithCert(nestedEntityToRef(invoice.company));
    if (!config) return null;
    const company = await companyService.findById(nestedEntityToRef(invoice.company), {}, undefined, "name vat");
    const credited = invoice.creditedInvoice ? await invoiceService.findById(invoice.creditedInvoice, {}, undefined, "fiscal") : null;
    const result = await registerFiscalInvoice(financeInvoiceFiscalData(invoice, credited?.fiscal?.iic), config, {
        languageCode,
        companyVat: company?.vat,
        companyName: company?.name,
        ...(invoice.customer.vatNumber ? {buyer: {name: invoice.customer.name, nipt: invoice.customer.vatNumber, address: invoice.customer.address}} : {}),
    });
    return result.fault ? {error: result.fault} : {iic: result.nslf, fic: result.nivf, qrUrl: result.qrVerifyUrl};
});

router.post(
    "/fiscalizePosOrder",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    validateFormZod(posOrderFiscalFormSchema),
    asyncHandler(async (params: any) => {
        assertPosOrderWrite(params, "state");
        const {company, languageCode, posOrderId, fiscalConfigId} = params;
        return {data: await sendPosOrderToCis(posOrderId, {languageCode, company}, fiscalConfigId)};
    }),
);

router.post(
    "/registerEinvoice",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 20}),
    validateFormZod(posOrderFiscalFormSchema),
    asyncHandler(async (params: any) => {
        assertPosOrderWrite(params, "state");
        const {company, languageCode, posOrderId, fiscalConfigId} = params;
        const order = await posOrderService.findOne({_id: posOrderId, company: company._id}, {withDeleted: false});
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
            if (e instanceof ServerError) throw e;
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
        // Registering the cash register changes the fiscal configuration
        const writable = SchemaGuard.sanitizeFields(
            FiscalConfig,
            getModelCollectedData("fiscalConfigs").writeFields!,
            "write",
            params.actionUserCtx,
            params.languageCode,
        );
        if (!writable.tcrCode) {
            throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
        }
        const {company, languageCode, fiscalConfigId, validFrom, validTo} = params;
        const config = await loadFiscalConfigWithCert(company._id, fiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await registerTcr(config, {
                languageCode,
                companyVat: company.vat,
                validFrom,
                validTo,
            });
            const refreshed = await fiscalConfigService.findById(config._id);
            return {
                data: {
                    tcrCode: result.tcrCode || refreshed?.tcrCode,
                    fault: result.fault,
                    config: refreshed ? fiscalConfigToDTO(refreshed) : undefined,
                },
            };
        } catch (e: any) {
            if (e instanceof ServerError) throw e;
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
        assertPosOrderWrite(params, "state");
        const {company, languageCode, fiscalConfigId, tin} = params;
        const config = await loadFiscalConfigWithCert(company._id, fiscalConfigId);
        if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);
        try {
            const result = await getTaxpayer(config, tin, languageCode);
            return {data: result};
        } catch (e: any) {
            if (e instanceof ServerError) throw e;
            throw apiValidationException("fiscal_taxpayer_error", "tin", null, languageCode, [e?.message || String(e)]);
        }
    }),
);
