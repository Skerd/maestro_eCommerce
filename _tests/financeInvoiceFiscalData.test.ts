import {describe, expect, it} from "vitest";
import {financeInvoiceFiscalData} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";

describe("financeInvoiceFiscalData", () => {
    it("turns invoice lines into CIS item rows with each line's VAT share", () => {
        const data = financeInvoiceFiscalData({
            number: "INV-2027-000042",
            lines: [{description: "Compact", quantity: 2, unitPrice: 60, total: 120}],
            vatRate: 20,
            pricesIncludeVat: true,
            total: 120,
            vatAmount: 20,
        });
        expect(data).toMatchObject({invOrdNum: "42", totPrice: 120, totTax: 20, payments: []});
        expect(data.items[0]).toMatchObject({"4__Q": "2.00", "5__UPB": "50.00", "6__UPA": "60.00", "8__PB": "100.00", "9__PA": "120.00", "10__VR": "20.00", "11__VA": "20.00"});
    });

    it("keeps a credit note's lines negative and points at the invoice it corrects", () => {
        const data = financeInvoiceFiscalData({
            number: "CN-2027-000003",
            lines: [{description: "Compact", quantity: 1, unitPrice: -100, total: -100}],
            vatRate: 0,
            pricesIncludeVat: true,
            total: -100,
            vatAmount: 0,
        }, "IIC-ORIGINAL");
        expect(data.items[0]).toMatchObject({"4__Q": "-1.00", "8__PB": "-100.00", "9__PA": "-100.00"});
        expect(data.corrective).toEqual({iic: "IIC-ORIGINAL"});
    });
});
