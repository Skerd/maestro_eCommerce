/**
 * Albanian CIS fiscalization + e-invoice orchestration.
 * Ported from fiskalizimi-develop/cp_fiscal (fiskalizo_fature / fiskalizo_ubl / RegisterTCR).
 */
import {randomUUID} from "crypto";
import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import {fiscalConfigService} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.service";
import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {
    buildIicInput,
    buildVerifyQrUrl,
    EINVOICE_SCHEMA,
    extractFault,
    extractNsText,
    FISCALIZATION_SCHEMA,
    getEinvoiceRequestData,
    getFiscalRequestData,
    getHeaderData,
    getIIC,
    registerRequest,
    signXml,
    tiraneIsoNow,
    type OrderedDict,
} from "./fiscalSoap";
import {buildUblInvoiceXml} from "./ublInvoice";
import {addMoney, includedPercentOfMinor, minorToNumber, percentOfMoney, prorateMoney, roundToCurrency, subtractMoney, toMinor} from "armonia/src/modules/core/helpers/money";
import {getGridFSStorage} from "@coreModule/utilities/gridfs/gridfsStorage";
import type {IInvoice} from "@financeModule/database/schemas/invoice/invoice";
import {decimalToNumber, nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ServerError} from "armonia/src/modules/core/types";
import axios from "axios";
import {localDateOf} from "@coreModule/utilities/time/timeWindows";


/** CIS issue times are Albanian local time. */
const FISCAL_TIME_ZONE = "Europe/Tirane";

function money(n: number): string {
    return Number.isFinite(n) ? roundToCurrency(n).toFixed(2) : n.toFixed(2);
}


/** A VAT rate in percent, not money: plain rounding to two places. */
export function roundRate(percent: number): number {
    return Math.round(percent * 100) / 100;
}

export type FiscalCert = {certificateBase64: string; certificatePassword: string};

/** Fiscal config id stored on the till that owns a POS order. */
export async function fiscalConfigIdForPosConfig(
    companyId: unknown,
    posConfigId: unknown,
): Promise<string | undefined> {
    if (!posConfigId) return undefined;
    const PosConfigModel = (await import("@eCommerceModule/database/schemas/posConfig/posConfig")).default;
    const till = await PosConfigModel.findOne({
        _id: posConfigId,
        company: companyId,
    }).noDeleted().select("fiscalConfig").lean();
    const ref = till?.fiscalConfig;
    if (!ref) return undefined;
    if (typeof ref === "object" && "_id" in ref && ref._id) return String(ref._id);
    return String(ref);
}

async function pkcs12Base64(mediaRef: unknown): Promise<string | null> {
    const mediaId = mediaRef && typeof mediaRef === "object" && "_id" in mediaRef
        ? (mediaRef as {_id: unknown})._id
        : mediaRef;
    if (!mediaId) return null;
    const MediaModel = (await import("@coreModule/database/schemas/media/media")).default;
    const media = await MediaModel.findById(mediaId).select("fileId");
    if (!media?.fileId) return null;
    const buffer = await getGridFSStorage("en-US").getFileBuffer(media.fileId);
    return buffer.toString("base64");
}

export async function loadFiscalConfigWithCert(
    companyId: unknown,
    fiscalConfigId?: string,
): Promise<(IFiscalConfig & FiscalCert) | null> {
    const filter: Record<string, unknown> = {
        company: companyId,
        isActive: true,
    };
    if (fiscalConfigId) filter._id = fiscalConfigId;
    const doc = await fiscalConfigService.findLatestWithPassword(filter);
    const mediaRef = doc?.certificate?.[0];
    if (!doc || !mediaRef || !doc.certificatePassword) return null;
    const certificateBase64 = await pkcs12Base64(mediaRef);
    if (!certificateBase64) return null;
    return Object.assign(doc.toObject(), {certificateBase64}) as IFiscalConfig & FiscalCert;
}

function resolveNipt(config: IFiscalConfig, languageCode: string, companyVat?: string): string {
    const nipt = (config.nipt || companyVat || "").trim();
    if (!nipt) throw apiValidationException("fiscal_nipt_missing", "", null, languageCode);
    return nipt;
}

function assertReady(config: IFiscalConfig & FiscalCert, languageCode: string, companyVat?: string): string {
    const nipt = resolveNipt(config, languageCode, companyVat);
    if (!config.tcrCode) throw apiValidationException("fiscal_tcr_not_registered", "", null, languageCode);
    if (!config.businessUnitCode || !config.softCode || !config.operatorCode) {
        throw apiValidationException("fiscal_codes_missing", "", null, languageCode);
    }
    if (!config.fiscalizationUrl || !config.selfcareUrl) {
        throw apiValidationException("fiscal_urls_missing", "", null, languageCode);
    }
    return nipt;
}

function payMethodType(paymentMethodType?: string): string {
    const t = (paymentMethodType || "").toLowerCase();
    if (t === "cash") return "BANKNOTE";
    if (t === "card" || t === "terminal") return "CARD";
    if (t === "voucher" || t === "gift") return "VOUCHER";
    return "OTHER";
}

function invOrdFromOrderName(name: string): string {
    const parts = name.split("/");
    const last = parts[parts.length - 1] || name;
    const n = parseInt(last, 10);
    return Number.isFinite(n) ? String(n) : last.replace(/\D/g, "") || "1";
}

export type RegisterInvoiceResult = {
    nslf: string;
    nivf?: string;
    iicSignature: string;
    invOrdNum: string;
    invNum: string;
    issueDateTime: string;
    qrVerifyUrl: string;
    signedXml: string;
    fault?: string;
    tcrCode?: string;
    operatorCode: string;
    businessUnitCode: string;
    typeOfInv: string;
};

/**
 * What a fiscal invoice registers: its order number, totals (negative for a refund),
 * payment methods and item rows, already in the CIS request shape.
 */
export type FiscalInvoiceData = {
    invOrdNum: string;
    totPrice: number;
    totTax: number;
    payments: OrderedDict[];
    items: OrderedDict[];
    /** The invoice it corrects (CIS CorrectiveInv): its IIC and the issue time sent with it. */
    corrective?: {iic: string; issueDateTime?: string};
    /** The issue time to send, when the caller stored it before sending (TD-B77); now otherwise. */
    issueDateTime?: string;
};

/** Who registers, and in which language rule failures answer. */
export type FiscalRegisterOptions = {
    languageCode: string;
    companyVat?: string;
    companyName?: string;
    buyer?: {name: string; nipt?: string; address?: string; town?: string; country?: string; idType?: string};
};

/** Signs and registers one invoice with the CIS (fiskalizo_fature), for any document that sold something. */
export async function registerFiscalInvoice(
    data: FiscalInvoiceData,
    config: IFiscalConfig & FiscalCert,
    opts: FiscalRegisterOptions,
): Promise<RegisterInvoiceResult> {
    const nipt = assertReady(config, opts.languageCode, opts.companyVat);
    const issueDateTime = data.issueDateTime ?? tiraneIsoNow();
    const uuid = randomUUID();
    const {invOrdNum, totPrice, totTax, items} = data;
    // The invoice number's year is the issue time's, in Albanian time, not the server's clock
    const year = localDateOf(new Date(issueDateTime), FISCAL_TIME_ZONE).slice(0, 4);
    const invNum = `${invOrdNum}/${year}/${config.tcrCode}`;
    const totWoVat = subtractMoney(totPrice, totTax);

    const iicInput = buildIicInput({
        nipt,
        issueDateTime,
        invOrdNum,
        businessUnitCode: config.businessUnitCode,
        tcrCode: config.tcrCode!,
        softCode: config.softCode,
        totPrice,
    });
    const {iic, iicSignature} = getIIC(iicInput, config.certificateBase64, config.certificatePassword, opts.languageCode);

    const payments = data.payments.length ? data.payments : [{"1__Type": "OTHER", "2__Amt": money(totPrice)}];
    const typeOfInv = payments.some(p => p["1__Type"] === "BANKNOTE") ? "CASH" : "NONCASH";

    const sameTaxes: OrderedDict[] = [];
    if (config.isVatRegistered && totTax !== 0 && totWoVat !== 0) {
        const rate = roundRate((Math.abs(totTax) / Math.abs(totWoVat)) * 100);
        sameTaxes.push({
            "1__NumOfItems": String(items.length),
            "2__PriceBefVAT": money(totWoVat),
            "3__VATRate": money(rate),
            "4__VATAmt": money(totTax),
        });
    }

    const seller: OrderedDict = {
        "1__IDType": "NUIS",
        "2__IDNum": nipt,
        "3__Name": config.sellerName || opts.companyName || "Seller",
        "4__Address": config.sellerAddress || "N/A",
        "5__Town": config.sellerTown || "Tirane",
        "6__Country": config.sellerCountry || "ALB",
    };

    const invoiceData: OrderedDict = {
        "1__TypeOfInv": typeOfInv,
        "2__IsSimplifiedInv": "true",
        "3__IssueDateTime": issueDateTime,
        "4__InvNum": invNum,
        "5__InvOrdNum": invOrdNum,
        "6__TCRCode": config.tcrCode!,
        "7__IsIssuerInVAT": config.isVatRegistered ? "true" : "false",
        "8__TotPriceWoVAT": money(totWoVat),
        "9__TotPrice": money(totPrice),
        "10__OperatorCode": config.operatorCode,
        "11__BusinUnitCode": config.businessUnitCode,
        "12__SoftCode": config.softCode,
        "13__IIC": iic,
        "14__IICSignature": iicSignature,
        "15__IsReverseCharge": "false",
        "16__IsEinvoice": "true",
        "18__PayMethods": {"1__PayMethod": payments},
        "26__Seller": seller,
        "30__Items": {"1__I": items},
    };
    if (config.isVatRegistered) {
        invoiceData["20__TotVATAmt"] = money(totTax);
    }
    if (sameTaxes.length) {
        invoiceData["31__SameTaxes"] = {"1__SameTax": sameTaxes};
    }
    if (opts.buyer?.nipt) {
        invoiceData["27__Buyer"] = {
            "1__IDType": opts.buyer.idType || "NUIS",
            "2__IDNum": opts.buyer.nipt,
            "3__Name": opts.buyer.name,
            "4__Address": opts.buyer.address || "N/A",
            "5__Town": opts.buyer.town || "Tirane",
            "6__Country": opts.buyer.country || "ALB",
        };
    }

    if (data.corrective) {
        invoiceData["24__CorrectiveInv"] = {
            "1__IICRef": data.corrective.iic,
            "2__IssueDateTime": data.corrective.issueDateTime || issueDateTime,
            "3__Type": "CORRECTIVE",
        };
    }

    const header = getHeaderData(issueDateTime, uuid);
    const request: OrderedDict = {
        ...getFiscalRequestData(),
        "5__Header": header,
        "6__Invoice": invoiceData,
    };

    const response = await registerRequest(
        config.fiscalizationUrl,
        config.certificateBase64,
        config.certificatePassword,
        request,
        "RegisterInvoiceRequest",
        {languageCode: opts.languageCode, proxyUrl: config.proxyUrl || undefined},
    );

    const fault = extractFault(response.xml);
    const fic = extractNsText(response.xml, "FIC", FISCALIZATION_SCHEMA);
    const qrVerifyUrl = buildVerifyQrUrl({
        selfcareUrl: config.selfcareUrl,
        iic,
        tin: nipt,
        issueDateTime,
        invOrdNum,
        businessUnitCode: config.businessUnitCode,
        tcrCode: config.tcrCode!,
        softCode: config.softCode,
        totPrice,
    });

    return {
        nslf: iic,
        nivf: fic,
        iicSignature,
        invOrdNum,
        invNum,
        issueDateTime,
        qrVerifyUrl,
        signedXml: response.signedXml,
        fault,
        tcrCode: config.tcrCode,
        operatorCode: config.operatorCode,
        businessUnitCode: config.businessUnitCode,
        typeOfInv,
    };
}

/**
 * A finance invoice (or credit note, whose lines are negative) as CIS invoice data.
 * Each line's VAT is its share of the invoice VAT, at the invoice's rate.
 */
export function financeInvoiceFiscalData(invoice: Pick<IInvoice, "number" | "lines" | "vatRate" | "pricesIncludeVat" | "total" | "vatAmount">, correctiveIic?: string): FiscalInvoiceData {
    const items: OrderedDict[] = invoice.lines.map((line) => {
        const gross = invoice.pricesIncludeVat ? roundToCurrency(line.total) : addMoney(line.total, percentOfMoney(line.total, invoice.vatRate));
        const tax = minorToNumber(includedPercentOfMinor(toMinor(gross), invoice.vatRate));
        const net = subtractMoney(gross, tax);
        const qty = Math.sign(decimalToNumber(line.total) || 1) * Math.abs(line.quantity || 1);
        const row: OrderedDict = {
            "1__N": line.description,
            "2__C": line.description,
            "3__U": "cope",
            "4__Q": money(qty),
            "5__UPB": money(Math.abs(net / qty)),
            "6__UPA": money(Math.abs(gross / qty)),
            "7__R": money(0),
            "8__PB": money(net),
            "9__PA": money(gross),
        };
        if (tax) {
            row["10__VR"] = money(invoice.vatRate);
            row["11__VA"] = money(tax);
        }
        return row;
    });
    const parts = invoice.number.split("-");
    return {
        invOrdNum: String(parseInt(parts[parts.length - 1], 10) || 1),
        totPrice: roundToCurrency(invoice.total),
        totTax: roundToCurrency(invoice.vatAmount),
        payments: [],
        items,
        ...(correctiveIic ? {corrective: {iic: correctiveIic}} : {}),
    };
}

/** What a till order registers as its order number and totals, negative for a refund; its IIC covers `totPrice`. */
function posInvoiceTotals(order: IPosOrder): {invOrdNum: string; totPrice: number; totTax: number} {
    return {
        invOrdNum: invOrdFromOrderName(order.name),
        totPrice: roundToCurrency(Number(order.isRefund ? -order.amountTotal : order.amountTotal)),
        totTax: roundToCurrency(Number(order.isRefund ? -order.amountTax : order.amountTax)),
    };
}

/** The sale a till refund returns, with the codes it was registered under. */
async function refundedSale(order: IPosOrder): Promise<IPosOrder | null> {
    const originalId = nestedEntityToRef(order.refundOf);
    return originalId
        ? posOrderService.findOne({_id: originalId, company: nestedEntityToRef(order.company)}, {}, undefined, "nslf nivf eic fiscalIssueDateTime")
        : null;
}

/**
 * A till refund's e-invoice corrects the sale's e-invoice (UBL type 384, BillingReference to the sale's IIC and issue
 * date), as its fiscal invoice corrects the sale's (TD-B71). A sale with no registered e-invoice has none to correct.
 */
async function refundedSaleEinvoiceReference(order: IPosOrder, languageCode: string): Promise<{id: string; issueDate: string}> {
    const original = await refundedSale(order);
    if (!original?.nslf || !original.nivf || !original.eic || !original.fiscalIssueDateTime) {
        throw apiValidationException("fiscal_einvoice_refund_original_missing", "posOrderId", null, languageCode);
    }
    return {id: original.nslf, issueDate: original.fiscalIssueDateTime.slice(0, 10)};
}

/**
 * A till refund is a corrective invoice of the sale it refunds (CIS CorrectiveInv): it names that sale's IIC and the
 * issue time sent with it. A sale CIS never registered has nothing to correct, so its refund is refused (TD-B71).
 */
async function refundedSaleReference(order: IPosOrder, languageCode: string): Promise<{iic: string; issueDateTime: string}> {
    const original = await refundedSale(order);
    if (!original?.nslf || !original.nivf || !original.fiscalIssueDateTime) {
        throw apiValidationException("fiscal_refund_original_not_fiscalized", "posOrderId", null, languageCode);
    }
    return {iic: original.nslf, issueDateTime: original.fiscalIssueDateTime};
}

export async function registerPosInvoice(
    order: IPosOrder,
    config: IFiscalConfig & FiscalCert,
    opts: FiscalRegisterOptions & {issueDateTime?: string},
): Promise<RegisterInvoiceResult> {
    if (order.nivf) {
        throw apiValidationException("fiscal_already_fiscalized", "posOrderId", null, opts.languageCode);
    }
    const {invOrdNum, totPrice, totTax} = posInvoiceTotals(order);
    const corrective = order.isRefund ? await refundedSaleReference(order, opts.languageCode) : undefined;

    const payments = order.payments.map(p => ({
        "1__Type": payMethodType(p.paymentMethodType),
        "2__Amt": money(Number(p.amount) * (order.isRefund ? -1 : 1)),
    }));
    const items: OrderedDict[] = order.lines.map(line => {
        const qty = Number(line.quantity) * (order.isRefund ? -1 : 1);
        const pb = subtractMoney(Number(line.priceSubtotal), Number(line.discountAmount || 0));
        // priceTotal is after discount; treat as gross when taxAmount present
        const tax = roundToCurrency(Number(line.taxAmount || 0));
        const pa = roundToCurrency(Number(line.priceTotal));
        const net = subtractMoney(pa, tax);
        const unitNet = qty !== 0 ? prorateMoney(net, 1, Math.abs(qty)) : 0;
        const unitGross = qty !== 0 ? prorateMoney(pa, 1, Math.abs(qty)) : 0;
        const row: OrderedDict = {
            "1__N": line.productName || "Item",
            "2__C": line.productSku || line.productName || "Item",
            "3__U": "cope",
            "4__Q": money(qty),
            "5__UPB": money(unitNet),
            "6__UPA": money(unitGross),
            "7__R": money(Number(line.discountPercent || 0)),
            "8__PB": money(order.isRefund ? -Math.abs(net) : net),
            "9__PA": money(order.isRefund ? -Math.abs(pa) : pa),
        };
        if (tax) {
            const rate = net !== 0 ? roundRate((tax / Math.abs(net)) * 100) : 0;
            row["10__VR"] = money(rate);
            row["11__VA"] = money(order.isRefund ? -Math.abs(tax) : tax);
        }
        return row;
    });

    return registerFiscalInvoice({invOrdNum, totPrice, totTax, payments, items, corrective, issueDateTime: opts.issueDateTime}, config, opts);
}

export async function registerTcr(
    config: IFiscalConfig & FiscalCert,
    opts: {languageCode: string; companyVat?: string; validFrom?: string; validTo?: string},
): Promise<{tcrCode?: string; fault?: string; signedXml: string}> {
    const nipt = resolveNipt(config, opts.languageCode, opts.companyVat);
    if (!config.tcrIntId || !config.maintainerCode) {
        throw apiValidationException("fiscal_tcr_fields_missing", "fiscalConfigId", null, opts.languageCode);
    }
    const issueDateTime = tiraneIsoNow();
    const header = getHeaderData(issueDateTime, randomUUID());
    const validFrom = opts.validFrom || issueDateTime.slice(0, 10);

    let tcrData: OrderedDict;
    if (!config.tcrCode) {
        tcrData = {
            "1__IssuerNUIS": nipt,
            "2__BusinUnitCode": config.businessUnitCode,
            "3__TCRIntID": config.tcrIntId,
            "4__SoftCode": config.softCode,
            "5__MaintainerCode": config.maintainerCode,
            "6__ValidFrom": validFrom,
            "7__Type": config.tcrType || "REGULAR",
        };
        if (opts.validTo) tcrData["8__ValidTo"] = opts.validTo;
    } else {
        if (!opts.validTo) throw apiValidationException("fiscal_tcr_valid_to_required", "validTo", null, opts.languageCode);
        tcrData = {
            "1__IssuerNUIS": nipt,
            "2__BusinUnitCode": config.businessUnitCode,
            "3__TCRIntID": config.tcrIntId,
            "4__ValidTo": opts.validTo,
            "5__Type": config.tcrType || "REGULAR",
        };
    }

    const request: OrderedDict = {
        ...getFiscalRequestData(),
        "5__Header": header,
        "6__TCR": tcrData,
    };
    const response = await registerRequest(
        config.fiscalizationUrl,
        config.certificateBase64,
        config.certificatePassword,
        request,
        "RegisterTCRRequest",
        {languageCode: opts.languageCode, proxyUrl: config.proxyUrl || undefined},
    );
    const fault = extractFault(response.xml);
    const tcrCode = extractNsText(response.xml, "TCRCode", FISCALIZATION_SCHEMA);
    if (tcrCode) {
        config.tcrCode = tcrCode;
        await fiscalConfigService.updateOne({_id: config._id}, {$set: {tcrCode}});
    }
    return {tcrCode, fault, signedXml: response.signedXml};
}

export async function getTaxpayer(
    config: IFiscalConfig & FiscalCert,
    tin: string,
    languageCode: string,
): Promise<{raw: string; fault?: string; tin?: string; name?: string}> {
    const issueDateTime = tiraneIsoNow();
    const request: OrderedDict = {
        ...getEinvoiceRequestData(),
        "1__Header": getHeaderData(issueDateTime, randomUUID()),
        "2__Filter": {"1__Tin": [{"1__@Tin": tin}]},
    };
    // Fix Filter structure to match Odoo: {'1__Tin': [filter]} where filter is tin string via @Tin
    // Odoo: GetTaxpayersRequest['2__Filter'] = {'1__Tin': [filter]} and filter is the tin string used oddly.
    // Looking again: {'1__Tin': [filter]} where filter = tin string — that would make list of strings.
    // Actually: filter = {'@Tin': tin} or just the tin. Code says: {'1__Tin': [filter]} with filter from argument.
    // In res_company: GetTaxpayersRequest['2__Filter'] = {'1__Tin': [filter]} and filter is the tin string.
    // For list of strings, dict2xml would fail. Looking at call: get_taxpayer(filter) with filter being tin.
    // I'll use attribute form: Tin="..." on Filter children.

    const requestFixed: OrderedDict = {
        ...getEinvoiceRequestData(),
        "4__Header": getHeaderData(issueDateTime, randomUUID()),
        "5__Filter": {"1__Tin": tin},
    };
    void request;
    const response = await registerRequest(
        config.einvoiceUrl,
        config.certificateBase64,
        config.certificatePassword,
        requestFixed,
        "GetTaxpayersRequest",
        {languageCode, einvoice: true, proxyUrl: config.proxyUrl || undefined},
    );
    const fault = extractFault(response.xml);
    const name = extractNsText(response.xml, "Name", EINVOICE_SCHEMA);
    const foundTin = extractNsText(response.xml, "Tin", EINVOICE_SCHEMA) || tin;
    return {raw: response.body, fault, tin: foundTin, name: name || undefined};
}

export type RegisterEinvoiceResult = {
    eic?: string;
    ublXml: string;
    fault?: string;
    signedXml: string;
};

/**
 * The IIC signature of a registered till sale. A sale resolved with the codes found in the CIS portal (D98) has none
 * stored, so it is signed again over the IIC input that was sent, with the issue time stored before sending: RSA
 * PKCS#1 v1.5 signs deterministically, so this is the signature CIS received. It is stored once recomputed; one whose
 * IIC is not the recorded NSLF was not the invoice sent, and is refused (TD-B77).
 */
async function posOrderIicSignature(
    order: IPosOrder,
    config: IFiscalConfig & FiscalCert,
    opts: {languageCode: string; companyVat?: string},
): Promise<string> {
    if (order.iicSignature) return order.iicSignature;
    const {languageCode} = opts;
    const tcrCode = order.fiscalTcrCode || config.tcrCode;
    if (!order.nslf || !order.fiscalIssueDateTime) {
        throw apiValidationException("fiscal_einvoice_not_fiscalized", "posOrderId", null, languageCode);
    }
    if (!tcrCode) throw apiValidationException("fiscal_tcr_not_registered", "", null, languageCode);
    const {invOrdNum, totPrice} = posInvoiceTotals(order);
    const iicInput = buildIicInput({
        nipt: resolveNipt(config, languageCode, opts.companyVat),
        issueDateTime: order.fiscalIssueDateTime,
        invOrdNum: order.fiscalInvOrdNum || invOrdNum,
        businessUnitCode: order.fiscalBusinessUnitCode || config.businessUnitCode,
        tcrCode,
        softCode: config.softCode,
        totPrice,
    });
    const {iic, iicSignature} = getIIC(iicInput, config.certificateBase64, config.certificatePassword, languageCode);
    if (iic !== order.nslf) throw apiValidationException("fiscal_iic_mismatch", "posOrderId", null, languageCode);
    await posOrderService.updateOne({_id: order._id, company: nestedEntityToRef(order.company)}, {$set: {iicSignature}});
    order.iicSignature = iicSignature;
    return iicSignature;
}

export async function registerEinvoiceForPosOrder(
    order: IPosOrder,
    config: IFiscalConfig & FiscalCert,
    opts: {languageCode: string; companyVat?: string; companyName?: string; currency?: string},
): Promise<RegisterEinvoiceResult> {
    const {nslf, nivf, fiscalizedAt} = order;
    const issueDateTime = order.fiscalIssueDateTime || tiraneIsoNow();
    if (!nslf || !nivf) {
        throw apiValidationException("fiscal_einvoice_not_fiscalized", "posOrderId", null, opts.languageCode);
    }
    if (fiscalizedAt) {
        const ageMs = Date.now() - new Date(fiscalizedAt).getTime();
        if (ageMs > 48 * 60 * 60 * 1000) {
            throw apiValidationException("fiscal_einvoice_too_late", "posOrderId", null, opts.languageCode);
        }
    }
    if (order.eic) throw apiValidationException("fiscal_einvoice_exists", "posOrderId", null, opts.languageCode);
    const billingReference = order.isRefund ? await refundedSaleEinvoiceReference(order, opts.languageCode) : undefined;
    const iicSignature = await posOrderIicSignature(order, config, opts);

    const nipt = resolveNipt(config, opts.languageCode, opts.companyVat);
    // A refund's amounts are negative, as its fiscal invoice registered them; unit prices stay positive
    const sign = order.isRefund ? -1 : 1;
    const totGross = roundToCurrency(sign * Number(order.amountTotal));
    const totVat = roundToCurrency(sign * Number(order.amountTax));
    const totNet = subtractMoney(totGross, totVat);
    const lines = order.lines.map(line => {
        const qty = sign * Number(line.quantity);
        const pa = roundToCurrency(sign * Number(line.priceTotal));
        const tax = roundToCurrency(sign * Number(line.taxAmount || 0));
        const net = subtractMoney(pa, tax);
        return {
            name: line.productName || "Item",
            quantity: qty,
            unitPriceNet: qty ? prorateMoney(net, Math.sign(qty), Math.abs(qty)) : 0,
            lineNet: net,
            lineGross: pa,
            vatRate: net ? roundRate((tax / net) * 100) : 0,
            vatAmount: tax,
        };
    });

    const ublUnsigned = buildUblInvoiceXml({
        invoiceNumber: order.fiscalInvNum || order.name,
        issueDate: issueDateTime.slice(0, 10),
        ...(billingReference ? {documentType: "384", billingReference} : {}),
        currency: opts.currency || "ALL",
        nslf,
        iicSignature,
        nivf,
        issueDateTime,
        operatorCode: config.operatorCode,
        businessUnitCode: config.businessUnitCode,
        softCode: config.softCode,
        seller: {
            name: config.sellerName || opts.companyName || "Seller",
            nipt,
            street: config.sellerAddress,
            city: config.sellerTown,
            country: (config.sellerCountry || "AL").slice(0, 2),
        },
        buyer: order.customerName
            ? {name: order.customerName, country: "AL"}
            : undefined,
        lines,
        totNet,
        totVat,
        totGross,
    });

    // Sign UBL root Id=Request (same enveloped approach as CIS requests)
    const ublSigned = signXml(ublUnsigned.replace(/^<\?xml[^>]*>\s*/, ""), config.certificateBase64, config.certificatePassword, opts.languageCode);
    const ublB64 = Buffer.from(ublSigned, "utf8").toString("base64");

    const header = getHeaderData(tiraneIsoNow(), randomUUID());
    const request: OrderedDict = {
        ...getEinvoiceRequestData(),
        "4__Header": header,
        "5__EinvoiceEnvelope": {
            "1__UblInvoice": [{"2__@UblInvoice": ublB64}],
        },
    };

    const response = await registerRequest(
        config.einvoiceUrl,
        config.certificateBase64,
        config.certificatePassword,
        request,
        "RegisterEinvoiceRequest",
        {languageCode: opts.languageCode, einvoice: true, proxyUrl: config.proxyUrl || undefined},
    );
    const fault = extractFault(response.xml);
    const eic = extractNsText(response.xml, "EIC", EINVOICE_SCHEMA);
    return {eic, ublXml: ublSigned, fault, signedXml: response.signedXml};
}

/** Connection failures that prove the request never left for CIS. */
const NOT_SENT_ERROR_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]);

/**
 * Whether a failed registration provably never reached CIS: a check that failed before sending, or a connection that
 * was never made. Anything else (a timeout, a dropped connection) may have registered the sale.
 */
function neverReachedCis(error: unknown): boolean {
    if (error instanceof ServerError) return true;
    return axios.isAxiosError(error) && error.code !== undefined && NOT_SENT_ERROR_CODES.has(error.code);
}

/**
 * Persist CIS result onto PosOrder and register the e-invoice. Runs outside any transaction, on a committed sale (D97):
 * the CIS call must never be repeated by a transaction retry. The sale is marked `fiscalRegisteringAt` before it is
 * sent and the mark is cleared with CIS's answer; a sale still marked is refused with `fiscal_registration_unconfirmed`
 * (TD-B75).
 */
export async function fiscalizePosOrder(
    orderId: string,
    companyId: unknown,
    opts: {
        languageCode: string;
        fiscalConfigId?: string;
        companyVat?: string;
        companyName?: string;
        currency?: string;
    },
): Promise<{order: IPosOrder; invoice: RegisterInvoiceResult; einvoice?: RegisterEinvoiceResult}> {
    const {languageCode} = opts;
    const order = await posOrderService.findOne({_id: orderId, company: companyId}, {withDeleted: false});
    if (!order) throw apiValidationException("pos_order_not_found", "posOrderId", null, languageCode);
    if (order.state !== "paid" && order.state !== "refunded") {
        throw apiValidationException("fiscal_order_state_invalid", "posOrderId", null, languageCode);
    }
    const fiscalConfigId = opts.fiscalConfigId ?? await fiscalConfigIdForPosConfig(companyId, order.config);
    if (!fiscalConfigId) throw apiValidationException("fiscal_pos_config_missing", "fiscalConfigId", null, languageCode);
    const config = await loadFiscalConfigWithCert(companyId, fiscalConfigId);
    if (!config) throw apiValidationException("fiscal_config_missing", "fiscalConfigId", null, languageCode);

    // Claimed in one write, so two callers never send a sale at once, and a sale whose answer may be lost is never
    // sent again: CIS has no lookup by IIC here, and a new send registers a second invoice (TD-B75). The issue time is
    // part of the IIC, so it is stored with the claim: a sale whose answer is lost can still be signed again (TD-B77)
    const registeringAt = new Date();
    const issueDateTime = tiraneIsoNow();
    const claim = await posOrderService.updateOne(
        {_id: order._id, company: companyId, fiscalRegisteringAt: null},
        {$set: {fiscalRegisteringAt: registeringAt, fiscalIssueDateTime: issueDateTime}},
    );
    if (!claim.matchedCount) throw apiValidationException("fiscal_registration_unconfirmed", "posOrderId", null, languageCode);
    order.fiscalRegisteringAt = registeringAt;
    order.fiscalIssueDateTime = issueDateTime;

    let invoice: RegisterInvoiceResult;
    try {
        invoice = await registerPosInvoice(order, config, {
            languageCode,
            companyVat: opts.companyVat,
            companyName: opts.companyName,
            issueDateTime,
        });
    } catch (error: unknown) {
        if (neverReachedCis(error)) {
            // The sale may be sent again. Should this write fail, the marker stays, which only asks for a manual check
            await posOrderService.updateOne({_id: order._id, company: companyId}, {$unset: {fiscalRegisteringAt: 1, fiscalIssueDateTime: 1}}).catch(() => undefined);
        }
        throw error;
    }

    order.nslf = invoice.nslf;
    order.iicSignature = invoice.iicSignature;
    order.nivf = invoice.nivf;
    order.qrVerifyUrl = invoice.nivf ? invoice.qrVerifyUrl : undefined;
    order.fiscalIssueDateTime = invoice.issueDateTime;
    order.fiscalInvNum = invoice.invNum;
    order.fiscalInvOrdNum = invoice.invOrdNum;
    order.fiscalTcrCode = invoice.tcrCode;
    order.fiscalOperatorCode = invoice.operatorCode;
    order.fiscalBusinessUnitCode = invoice.businessUnitCode;
    order.fiscalTypeOfInv = invoice.typeOfInv;
    order.set("fiscalConfig", config._id);
    order.fiscalizedAt = invoice.nivf ? new Date() : undefined;
    order.fiscalError = invoice.fault || undefined;
    order.fiscalRequestXml = invoice.signedXml;
    order.fiscalRegisteringAt = undefined;
    await order.save();

    if (invoice.fault || !invoice.nivf) {
        return {order, invoice};
    }

    let einvoice: RegisterEinvoiceResult | undefined;
    try {
        einvoice = await registerEinvoiceForPosOrder(order, config, {
            languageCode,
            companyVat: opts.companyVat,
            companyName: opts.companyName,
            currency: opts.currency,
        });
        if (einvoice.eic) {
            order.eic = einvoice.eic;
            order.einvoiceAt = new Date();
            order.ublXml = einvoice.ublXml;
            order.fiscalError = undefined;
        } else if (einvoice.fault) {
            order.fiscalError = einvoice.fault;
        }
        await order.save();
    } catch (e: unknown) {
        order.fiscalError = e instanceof Error ? e.message : String(e);
        await order.save();
    }

    return {order, invoice, einvoice};
}
