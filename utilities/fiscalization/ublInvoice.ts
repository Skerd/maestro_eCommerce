/**
 * Minimal UBL 2.1 Invoice builder for Albanian e-invoice (RegisterEinvoice).
 * Ports the fiscal notes / structure from cp_fiscal generate_invoice_ubl_xml_etree_sign.
 */
export type UblInvoiceInput = {
    invoiceNumber: string;
    issueDate: string; // YYYY-MM-DD
    dueDate?: string;
    documentType?: string; // 380 = commercial invoice
    profileId?: string;
    currency: string;
    taxCurrency?: string;
    nslf: string;
    iicSignature: string;
    nivf: string;
    issueDateTime: string;
    operatorCode: string;
    businessUnitCode: string;
    softCode: string;
    seller: {
        name: string;
        nipt: string;
        street?: string;
        city?: string;
        country: string;
    };
    buyer?: {
        name: string;
        nipt?: string;
        street?: string;
        city?: string;
        country?: string;
    };
    lines: Array<{
        name: string;
        quantity: number;
        unitPriceNet: number;
        lineNet: number;
        lineGross: number;
        vatRate?: number;
        vatAmount?: number;
    }>;
    totNet: number;
    totVat: number;
    totGross: number;
};

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function money(n: number): string {
    return n.toFixed(2);
}

function partyXml(
    tag: "AccountingSupplierParty" | "AccountingCustomerParty",
    party: {name: string; nipt?: string; street?: string; city?: string; country?: string},
): string {
    const id = party.nipt
        ? `<cac:PartyTaxScheme>
          <cbc:CompanyID>${esc(party.nipt)}</cbc:CompanyID>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:PartyTaxScheme>
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${esc(party.name)}</cbc:RegistrationName>
          <cbc:CompanyID>${esc(party.nipt)}</cbc:CompanyID>
        </cac:PartyLegalEntity>`
        : `<cac:PartyLegalEntity>
          <cbc:RegistrationName>${esc(party.name)}</cbc:RegistrationName>
        </cac:PartyLegalEntity>`;
    return `<cac:${tag}>
      <cac:Party>
        <cac:PartyName><cbc:Name>${esc(party.name)}</cbc:Name></cac:PartyName>
        <cac:PostalAddress>
          ${party.street ? `<cbc:StreetName>${esc(party.street)}</cbc:StreetName>` : ""}
          ${party.city ? `<cbc:CityName>${esc(party.city)}</cbc:CityName>` : ""}
          <cac:Country><cbc:IdentificationCode>${esc(party.country || "AL")}</cbc:IdentificationCode></cac:Country>
        </cac:PostalAddress>
        ${id}
      </cac:Party>
    </cac:${tag}>`;
}

/** Build unsigned UBL Invoice XML (Id="Request" on root for XML-DSig). */
export function buildUblInvoiceXml(input: UblInvoiceInput): string {
    const notes = [
        `IIC=${input.nslf}#AAI#`,
        `IICSignature=${input.iicSignature}#AAI#`,
        `FIC=${input.nivf}#AAI#`,
        `IssueDateTime=${input.issueDateTime}#AAI#`,
        `OperatorCode=${input.operatorCode}#AAI#`,
        `BusinessUnitCode=${input.businessUnitCode}#AAI#`,
        `SoftwareCode=${input.softCode}#AAI#`,
        "IsBadDebtInv=false#AAI#",
    ];
    const noteXml = notes.map(n => `<cbc:Note>${esc(n)}</cbc:Note>`).join("\n    ");
    const linesXml = input.lines
        .map((line, idx) => {
            const vatBlock =
                line.vatRate != null && line.vatAmount != null
                    ? `<cac:TaxTotal>
          <cbc:TaxAmount currencyID="${esc(input.currency)}">${money(line.vatAmount)}</cbc:TaxAmount>
          <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${esc(input.currency)}">${money(line.lineNet)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${esc(input.currency)}">${money(line.vatAmount)}</cbc:TaxAmount>
            <cac:TaxCategory>
              <cbc:ID>S</cbc:ID>
              <cbc:Percent>${money(line.vatRate)}</cbc:Percent>
              <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
            </cac:TaxCategory>
          </cac:TaxSubtotal>
        </cac:TaxTotal>`
                    : "";
            return `<cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${money(line.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${esc(input.currency)}">${money(line.lineNet)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${esc(line.name)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${esc(input.currency)}">${money(line.unitPriceNet)}</cbc:PriceAmount></cac:Price>
      ${vatBlock}
    </cac:InvoiceLine>`;
        })
        .join("\n    ");

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  Id="Request">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2"
          xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2"
          xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
          <sac:SignatureInformation/>
        </sig:UBLDocumentSignatures>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>${esc(input.profileId || "P1")}</cbc:ProfileID>
  <cbc:ID>${esc(input.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${esc(input.issueDate)}</cbc:IssueDate>
  ${input.dueDate ? `<cbc:DueDate>${esc(input.dueDate)}</cbc:DueDate>` : ""}
  <cbc:InvoiceTypeCode>${esc(input.documentType || "380")}</cbc:InvoiceTypeCode>
  ${noteXml}
  <cbc:DocumentCurrencyCode>${esc(input.currency)}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${esc(input.taxCurrency || input.currency)}</cbc:TaxCurrencyCode>
  ${partyXml("AccountingSupplierParty", input.seller)}
  ${partyXml("AccountingCustomerParty", input.buyer || {name: "Walk-in Customer", country: "AL"})}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${esc(input.currency)}">${money(input.totVat)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${esc(input.currency)}">${money(input.totNet)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${esc(input.currency)}">${money(input.totVat)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${input.totVat > 0 ? "S" : "Z"}</cbc:ID>
        <cbc:Percent>${input.totNet > 0 ? money((input.totVat / input.totNet) * 100) : "0.00"}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${esc(input.currency)}">${money(input.totNet)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${esc(input.currency)}">${money(input.totNet)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${esc(input.currency)}">${money(input.totGross)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${esc(input.currency)}">${money(input.totGross)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
}
