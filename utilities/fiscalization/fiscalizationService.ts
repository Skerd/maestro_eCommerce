/**
 * Albanian CIS fiscalization + e-invoice orchestration.
 * Ported from fiskalizimi-develop/cp_fiscal (fiskalizo_fature / fiskalizo_ubl / RegisterTCR).
 */
import {randomUUID} from "crypto";
import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import FiscalConfig from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
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
import {roundMoney} from "@eCommerceModule/utilities/services/money";
import {getGridFSStorage} from "@coreModule/utilities/gridfs/gridfsStorage";


function money(n: number): string {
    return roundMoney(n).toFixed(2);
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
    const doc = await FiscalConfig.findOne(filter).noDeleted()
        .select("+certificatePassword")
        .sort({updatedAt: -1});
    const mediaRef = doc?.certificate?.[0];
    if (!doc || !mediaRef || !doc.certificatePassword) return null;
    const certificateBase64 = await pkcs12Base64(mediaRef);
    if (!certificateBase64) return null;
    return Object.assign(doc.toObject(), {certificateBase64}) as IFiscalConfig & FiscalCert;
}

function resolveNipt(config: IFiscalConfig, companyVat?: string): string {
    const nipt = (config.nipt || companyVat || "").trim();
    if (!nipt) throw new Error("Fiscal NIPT/NUIS is required (set FiscalConfig.nipt or company.vat)");
    return nipt;
}

function assertReady(config: IFiscalConfig & FiscalCert, companyVat?: string): string {
    const nipt = resolveNipt(config, companyVat);
    if (!config.tcrCode) throw new Error("TCR code missing — register TCR first");
    if (!config.businessUnitCode || !config.softCode || !config.operatorCode) {
        throw new Error("businessUnitCode, softCode, and operatorCode are required");
    }
    if (!config.fiscalizationUrl || !config.selfcareUrl) {
        throw new Error("fiscalizationUrl and selfcareUrl are required");
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

export async function registerPosInvoice(
    order: IPosOrder,
    config: IFiscalConfig & FiscalCert,
    opts?: {
        companyVat?: string;
        companyName?: string;
        buyer?: {name: string; nipt?: string; address?: string; town?: string; country?: string; idType?: string};
    },
): Promise<RegisterInvoiceResult> {
    if (order.nivf) {
        throw new Error("Order already fiscalized (has NIVF/FIC)");
    }
    const nipt = assertReady(config, opts?.companyVat);
    const issueDateTime = tiraneIsoNow();
    const uuid = randomUUID();
    const invOrdNum = invOrdFromOrderName(order.name);
    const year = new Date().getFullYear();
    const invNum = `${invOrdNum}/${year}/${config.tcrCode}`;
    const totPrice = roundMoney(Number(order.isRefund ? -order.amountTotal : order.amountTotal));
    const totTax = roundMoney(Number(order.isRefund ? -order.amountTax : order.amountTax));
    const totWoVat = roundMoney(totPrice - totTax);

    const iicInput = buildIicInput({
        nipt,
        issueDateTime,
        invOrdNum,
        businessUnitCode: config.businessUnitCode,
        tcrCode: config.tcrCode!,
        softCode: config.softCode,
        totPrice,
    });
    const {iic, iicSignature} = getIIC(iicInput, config.certificateBase64, config.certificatePassword);

    const payments = ((order.payments as any[]) || []).map(p => ({
        "1__Type": payMethodType(p.paymentMethodType),
        "2__Amt": money(Number(p.amount) * (order.isRefund ? -1 : 1)),
    }));
    if (!payments.length) {
        payments.push({"1__Type": "OTHER", "2__Amt": money(totPrice)});
    }
    const typeOfInv = payments.some(p => p["1__Type"] === "BANKNOTE") ? "CASH" : "NONCASH";

    const items: OrderedDict[] = ((order.lines as any[]) || []).map(line => {
        const qty = Number(line.quantity) * (order.isRefund ? -1 : 1);
        const pb = roundMoney(Number(line.priceSubtotal) - Number(line.discountAmount || 0));
        // priceTotal is after discount; treat as gross when taxAmount present
        const tax = roundMoney(Number(line.taxAmount || 0));
        const pa = roundMoney(Number(line.priceTotal));
        const net = roundMoney(pa - tax);
        const unitNet = qty !== 0 ? roundMoney(net / Math.abs(qty)) : 0;
        const unitGross = qty !== 0 ? roundMoney(pa / Math.abs(qty)) : 0;
        const row: OrderedDict = {
            "1__N": line.productName || "Item",
            "2__C": line.productSku || line.productName || "Item",
            "3__U": "cope",
            "4__Q": money(qty),
            "5__UPB": money(unitNet),
            "6__UPA": money(unitGross),
            "7__R": money(Number(line.discountPercent || 0)),
            "8__PB": money(net * (order.isRefund ? -1 : 1) === net ? net : (order.isRefund ? -Math.abs(net) : net)),
            "9__PA": money(order.isRefund ? -Math.abs(pa) : pa),
        };
        if (tax) {
            const rate = net !== 0 ? roundMoney((tax / Math.abs(net)) * 100) : 0;
            row["10__VR"] = money(rate);
            row["11__VA"] = money(order.isRefund ? -Math.abs(tax) : tax);
        }
        return row;
    });
    // Fix PB signs for refunds
    for (const row of items) {
        if (order.isRefund) {
            row["8__PB"] = money(-Math.abs(Number(row["8__PB"])));
            row["9__PA"] = money(-Math.abs(Number(row["9__PA"])));
        }
    }

    const sameTaxes: OrderedDict[] = [];
    if (config.isVatRegistered && totTax !== 0 && totWoVat !== 0) {
        const rate = roundMoney((Math.abs(totTax) / Math.abs(totWoVat)) * 100);
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
        "3__Name": config.sellerName || opts?.companyName || "Seller",
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
    if (opts?.buyer?.nipt) {
        invoiceData["27__Buyer"] = {
            "1__IDType": opts.buyer.idType || "NUIS",
            "2__IDNum": opts.buyer.nipt,
            "3__Name": opts.buyer.name,
            "4__Address": opts.buyer.address || "N/A",
            "5__Town": opts.buyer.town || "Tirane",
            "6__Country": opts.buyer.country || "ALB",
        };
    }

    if ((order as any).refundOf && (order as any).correctiveIic) {
        invoiceData["24__CorrectiveInv"] = {
            "1__IICRef": (order as any).correctiveIic,
            "2__IssueDateTime": (order as any).correctiveIssueDateTime || issueDateTime,
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
        {proxyUrl: config.proxyUrl || undefined},
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

export async function registerTcr(
    config: IFiscalConfig & FiscalCert,
    opts?: {companyVat?: string; validFrom?: string; validTo?: string},
): Promise<{tcrCode?: string; fault?: string; signedXml: string}> {
    const nipt = resolveNipt(config, opts?.companyVat);
    if (!config.tcrIntId) throw new Error("tcrIntId is required to register TCR");
    if (!config.maintainerCode) throw new Error("maintainerCode is required to register TCR");
    const issueDateTime = tiraneIsoNow();
    const header = getHeaderData(issueDateTime, randomUUID());
    const validFrom = opts?.validFrom || issueDateTime.slice(0, 10);

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
        if (opts?.validTo) tcrData["8__ValidTo"] = opts.validTo;
    } else {
        if (!opts?.validTo) throw new Error("validTo is required when updating an existing TCR");
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
        {proxyUrl: config.proxyUrl || undefined},
    );
    const fault = extractFault(response.xml);
    const tcrCode = extractNsText(response.xml, "TCRCode", FISCALIZATION_SCHEMA);
    if (tcrCode) {
        config.tcrCode = tcrCode;
        await FiscalConfig.updateOne({_id: config._id}, {$set: {tcrCode}});
    }
    return {tcrCode, fault, signedXml: response.signedXml};
}

export async function getTaxpayer(
    config: IFiscalConfig & FiscalCert,
    tin: string,
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
        {einvoice: true, proxyUrl: config.proxyUrl || undefined},
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

export async function registerEinvoiceForPosOrder(
    order: IPosOrder,
    config: IFiscalConfig & FiscalCert,
    opts?: {companyVat?: string; companyName?: string; currency?: string},
): Promise<RegisterEinvoiceResult> {
    const nslf = (order as any).nslf as string | undefined;
    const nivf = (order as any).nivf as string | undefined;
    const iicSignature = (order as any).iicSignature as string | undefined;
    const issueDateTime = ((order as any).fiscalIssueDateTime as string) || tiraneIsoNow();
    if (!nslf || !nivf || !iicSignature) {
        throw new Error("Fiscalize invoice first (need NSLF/NIVF/IICSignature) before e-invoice");
    }
    const fiscalizedAt = (order as any).fiscalizedAt as Date | undefined;
    if (fiscalizedAt) {
        const ageMs = Date.now() - new Date(fiscalizedAt).getTime();
        if (ageMs > 48 * 60 * 60 * 1000) {
            throw new Error("Cannot create e-invoice more than 48 hours after fiscalization");
        }
    }
    if ((order as any).eic) throw new Error("Order already has EIC");

    const nipt = resolveNipt(config, opts?.companyVat);
    const totGross = roundMoney(Number(order.amountTotal));
    const totVat = roundMoney(Number(order.amountTax));
    const totNet = roundMoney(totGross - totVat);
    const lines = ((order.lines as any[]) || []).map(line => {
        const qty = Number(line.quantity);
        const pa = roundMoney(Number(line.priceTotal));
        const tax = roundMoney(Number(line.taxAmount || 0));
        const net = roundMoney(pa - tax);
        return {
            name: line.productName || "Item",
            quantity: qty,
            unitPriceNet: qty ? roundMoney(net / qty) : 0,
            lineNet: net,
            lineGross: pa,
            vatRate: net ? roundMoney((tax / net) * 100) : 0,
            vatAmount: tax,
        };
    });

    const ublUnsigned = buildUblInvoiceXml({
        invoiceNumber: (order as any).fiscalInvNum || order.name,
        issueDate: issueDateTime.slice(0, 10),
        currency: opts?.currency || "ALL",
        nslf,
        iicSignature,
        nivf,
        issueDateTime,
        operatorCode: config.operatorCode,
        businessUnitCode: config.businessUnitCode,
        softCode: config.softCode,
        seller: {
            name: config.sellerName || opts?.companyName || "Seller",
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
    const ublSigned = signXml(ublUnsigned.replace(/^<\?xml[^>]*>\s*/, ""), config.certificateBase64, config.certificatePassword);
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
        {einvoice: true, proxyUrl: config.proxyUrl || undefined},
    );
    const fault = extractFault(response.xml);
    const eic = extractNsText(response.xml, "EIC", EINVOICE_SCHEMA);
    return {eic, ublXml: ublSigned, fault, signedXml: response.signedXml};
}

/** Persist CIS result onto PosOrder and register the e-invoice. */
export async function fiscalizePosOrder(
    orderId: string,
    companyId: unknown,
    opts?: {
        fiscalConfigId?: string;
        companyVat?: string;
        companyName?: string;
        currency?: string;
    },
): Promise<{order: IPosOrder; invoice: RegisterInvoiceResult; einvoice?: RegisterEinvoiceResult}> {
    const order = await PosOrder.findOne({_id: orderId, company: companyId}).noDeleted();
    if (!order) throw new Error("POS order not found");
    if (order.state !== "paid" && order.state !== "refunded") {
        throw new Error("Only paid/refunded orders can be fiscalized");
    }
    const fiscalConfigId = opts?.fiscalConfigId ?? await fiscalConfigIdForPosConfig(companyId, order.config);
    if (!fiscalConfigId) throw new Error("POS config has no fiscal config");
    const config = await loadFiscalConfigWithCert(companyId, fiscalConfigId);
    if (!config) throw new Error("No active FiscalConfig with certificate found");

    const invoice = await registerPosInvoice(order, config, {
        companyVat: opts?.companyVat,
        companyName: opts?.companyName,
    });

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
    await order.save();

    if (invoice.fault || !invoice.nivf) {
        return {order, invoice};
    }

    let einvoice: RegisterEinvoiceResult | undefined;
    try {
        einvoice = await registerEinvoiceForPosOrder(order, config, {
            companyVat: opts?.companyVat,
            companyName: opts?.companyName,
            currency: opts?.currency,
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
