/**
 * Albanian DPT fiscalization SOAP helpers — ported from
 * fiskalizimi-develop/cp_fiscal/models/soap_methods_fiskalizim.py
 */
import * as crypto from "crypto";
import forge from "node-forge";
import axios from "axios";
import {HttpsProxyAgent} from "https-proxy-agent";
import {SignedXml} from "xml-crypto";
import {DOMParser} from "@xmldom/xmldom";

export const FISCALIZATION_SCHEMA = "https://eFiskalizimi.tatime.gov.al/FiscalizationService/schema";
export const EINVOICE_SCHEMA = "https://Einvoice.tatime.gov.al/EinvoiceService/schema";
export const FISCAL_VERSION = "3";
export const EINVOICE_VERSION = "1";

/** Attribute-centric ordered dict (Odoo/cp_fiscal style). Interface avoids circular type alias. */
export interface OrderedDict {
    [key: string]: string | number | boolean | OrderedDict | OrderedDict[];
}

type FiscalXmlDocument = ReturnType<DOMParser["parseFromString"]>;

function sortKey(key: string): number | string {
    const m = /^(\d+)__/.exec(key);
    return m ? Number(m[1]) : key;
}

function stripOrder(key: string): string {
    const m = /^\d+__(.*)/.exec(key);
    return m ? m[1] : key;
}

/** Convert ordered-dict (Odoo/cp_fiscal style) to attribute-centric XML. */
export function dict2xml(d: OrderedDict | OrderedDict[], rootNode?: string): string {
    const wrap = rootNode != null && !Array.isArray(d);
    const root = rootNode ?? "objects";
    const rootSingular = !rootNode && root.endsWith("s") ? root.slice(0, -1) : root;
    let xml = "";
    const children: string[] = [];
    let endTagElement = false;

    if (!Array.isArray(d)) {
        const entries = Object.entries(d).sort((a, b) => {
            const ka = sortKey(a[0]);
            const kb = sortKey(b[0]);
            if (typeof ka === "number" && typeof kb === "number") return ka - kb;
            return String(ka).localeCompare(String(kb));
        });
        for (const [key, value] of entries) {
            const key2 = stripOrder(key);
            endTagElement = false;
            if (value && typeof value === "object" && !Array.isArray(value)) {
                children.push(dict2xml(value as OrderedDict, key));
            } else if (Array.isArray(value)) {
                children.push(dict2xml(value as OrderedDict[], key));
            } else if (!key.includes("@")) {
                xml += ` ${key2}="${escapeXmlAttr(String(value))}"`;
            } else {
                xml += `>${escapeXmlText(String(value))}</${key2.slice(1)}`;
                endTagElement = true;
            }
        }
    } else {
        for (const value of d) {
            children.push(dict2xml(value, rootSingular));
        }
    }

    const endTag = children.length > 0 || endTagElement ? ">" : "/>";
    if (wrap || !Array.isArray(d)) {
        xml = `<${stripOrder(root)}${xml}${endTag}`;
    }
    if (children.length) {
        xml += children.join("");
        if (wrap || !Array.isArray(d)) xml += `</${stripOrder(root)}>`;
    }
    return xml;
}

function escapeXmlAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeXmlText(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function getHeaderData(isoDateTime: string, uuid: string): OrderedDict {
    return {"1__SendDateTime": isoDateTime, "2__UUID": uuid};
}

export function getFiscalRequestData(): OrderedDict {
    return {
        "1__xmlns": FISCALIZATION_SCHEMA,
        "2__xmlns:ns2": "http://www.w3.org/2000/09/xmldsig#",
        "3__Id": "Request",
        "4__Version": FISCAL_VERSION,
    };
}

export function getEinvoiceRequestData(): OrderedDict {
    return {
        "1__xmlns": EINVOICE_SCHEMA,
        "2__Id": "Request",
        "3__Version": EINVOICE_VERSION,
    };
}

export type Pkcs12Material = {
    privateKeyPem: string;
    certificatePem: string;
};

export function loadPkcs12(certificateBase64: string, password: string): Pkcs12Material {
    const der = forge.util.decode64(certificateBase64.replace(/\s+/g, ""));
    const asn1 = forge.asn1.fromDer(der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    const keyBags =
        p12.getBags({bagType: forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag] ||
        p12.getBags({bagType: forge.pki.oids.keyBag})[forge.pki.oids.keyBag];
    const certBags = p12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag];
    if (!keyBags?.[0]?.key || !certBags?.[0]?.cert) {
        throw new Error("Invalid PKCS#12: missing private key or certificate");
    }
    return {
        privateKeyPem: forge.pki.privateKeyToPem(keyBags[0].key),
        certificatePem: forge.pki.certificateToPem(certBags[0].cert),
    };
}

/**
 * IIC (NSLF): RSA-SHA256 PKCS1v15 signature of concatenated input, then MD5(hex) of signature bytes.
 */
export function getIIC(
    iicInput: string,
    certificateBase64: string,
    password: string,
): {iicSignature: string; iic: string} {
    const {privateKeyPem} = loadPkcs12(certificateBase64, password);
    const signature = crypto.sign("sha256", Buffer.from(iicInput, "ascii"), {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
    });
    const iic = crypto.createHash("md5").update(signature).digest("hex").toUpperCase();
    return {iicSignature: signature.toString("hex"), iic};
}

/** Enveloped XML-DSig (rsa-sha256 / sha256 / exclusive c14n) on element Id="Request". */
export function signXml(requestXml: string, certificateBase64: string, password: string): string {
    const {privateKeyPem, certificatePem} = loadPkcs12(certificateBase64, password);
    const signer = new SignedXml({
        privateKey: privateKeyPem,
        publicCert: certificatePem,
        signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
        canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
    });
    signer.addReference({
        xpath: "//*[@Id='Request']",
        digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
        transforms: [
            "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
            "http://www.w3.org/2001/10/xml-exc-c14n#",
        ],
        uri: "#Request",
    });
    signer.computeSignature(requestXml, {
        location: {reference: "//*[@Id='Request']", action: "append"},
    });
    return signer.getSignedXml();
}

export function wrapSoapEnvelope(signedXml: string, einvoice = false): string {
    if (!einvoice) {
        return `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ns0="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${FISCALIZATION_SCHEMA}">
   <SOAP-ENV:Header/>
   <ns0:Body>
      ${signedXml}
   </ns0:Body>
</SOAP-ENV:Envelope>`;
    }
    return `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
   <S:Header/>
   <S:Body>
      ${signedXml}
   </S:Body>
</S:Envelope>`;
}

export async function postSoap(
    signedInnerXml: string,
    url: string,
    opts?: {einvoice?: boolean; proxyUrl?: string},
): Promise<{status: number; body: string; xml: FiscalXmlDocument}> {
    const payload = wrapSoapEnvelope(signedInnerXml, !!opts?.einvoice);
    const axiosConfig: Record<string, unknown> = {
        headers: {"Content-Type": "text/xml; charset=UTF-8"},
        timeout: 60000,
        validateStatus: () => true,
        responseType: "text",
        proxy: false,
    };
    if (opts?.proxyUrl) {
        axiosConfig.httpsAgent = new HttpsProxyAgent(opts.proxyUrl);
        axiosConfig.httpAgent = new HttpsProxyAgent(opts.proxyUrl);
    }
    const res = await axios.post(url, payload, axiosConfig);
    const body = typeof res.data === "string" ? res.data : String(res.data ?? "");
    const xml = new DOMParser().parseFromString(body, "text/xml");
    return {status: res.status, body, xml};
}

export async function registerRequest(
    url: string,
    certificateBase64: string,
    password: string,
    dictData: OrderedDict,
    requestType: string,
    opts?: {einvoice?: boolean; proxyUrl?: string},
): Promise<{status: number; body: string; xml: FiscalXmlDocument; signedXml: string}> {
    const signedXml = getXmlSigned(certificateBase64, password, dictData, requestType);
    const r = await postSoap(signedXml, url, opts);
    return {...r, signedXml};
}

export function getXmlSigned(
    certificateBase64: string,
    password: string,
    dictData: OrderedDict,
    requestType: string,
): string {
    return signXml(dict2xml(dictData, requestType), certificateBase64, password);
}

export function extractFault(xml: FiscalXmlDocument): string | undefined {
    const faults = xml.getElementsByTagName("faultstring");
    if (faults.length) return faults[0].textContent || undefined;
    return undefined;
}

export function extractNsText(xml: FiscalXmlDocument, localName: string, ns: string): string | undefined {
    const nodes = xml.getElementsByTagNameNS(ns, localName);
    if (nodes.length) return nodes[0].textContent || undefined;
    const plain = xml.getElementsByTagName(localName);
    if (plain.length) return plain[0].textContent || undefined;
    return undefined;
}

export function buildVerifyQrUrl(params: {
    selfcareUrl: string;
    iic: string;
    tin: string;
    issueDateTime: string;
    invOrdNum: string | number;
    businessUnitCode: string;
    tcrCode: string;
    softCode: string;
    totPrice: number;
}): string {
    const base = params.selfcareUrl.replace(/\/?$/, "/") + "verify";
    const q = new URLSearchParams({
        iic: params.iic,
        tin: params.tin,
        crtd: params.issueDateTime,
        ord: String(params.invOrdNum),
        bu: params.businessUnitCode,
        cr: params.tcrCode,
        sw: params.softCode,
        prc: params.totPrice.toFixed(2),
    });
    return `${base}?${q.toString()}`;
}

/** IIC input: NUIS|IssueDateTime|InvOrdNum|BusinUnitCode|TCRCode|SoftCode|TotPrice */
export function buildIicInput(parts: {
    nipt: string;
    issueDateTime: string;
    invOrdNum: string | number;
    businessUnitCode: string;
    tcrCode: string;
    softCode: string;
    totPrice: number;
}): string {
    return [
        parts.nipt,
        parts.issueDateTime,
        String(parts.invOrdNum),
        parts.businessUnitCode,
        parts.tcrCode,
        parts.softCode,
        parts.totPrice.toFixed(2),
    ].join("|");
}

export function tiraneIsoNow(): string {
    const probe = new Date();
    const utc = probe.getTime() + probe.getTimezoneOffset() * 60000;
    const tirane = new Date(utc + getTiraneOffsetMinutes(probe) * 60000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const offsetMin = getTiraneOffsetMinutes(probe);
    const sign = offsetMin >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    const oh = pad(Math.floor(abs / 60));
    const om = pad(abs % 60);
    return `${tirane.getFullYear()}-${pad(tirane.getMonth() + 1)}-${pad(tirane.getDate())}T${pad(tirane.getHours())}:${pad(tirane.getMinutes())}:${pad(tirane.getSeconds())}${sign}${oh}:${om}`;
}

function getTiraneOffsetMinutes(d: Date): number {
    const year = d.getUTCFullYear();
    const marchLastSun = lastSunday(year, 2);
    const octLastSun = lastSunday(year, 9);
    const t = d.getTime();
    if (t >= Date.UTC(year, 2, marchLastSun, 1) && t < Date.UTC(year, 9, octLastSun, 1)) return 120;
    return 60;
}

function lastSunday(year: number, monthIndex: number): number {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    const day = last.getUTCDay();
    return last.getUTCDate() - day;
}
