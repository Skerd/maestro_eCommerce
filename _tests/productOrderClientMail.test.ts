import {beforeEach, describe, expect, it, vi} from "vitest";

const {sent} = vi.hoisted(() => ({sent: [] as {to: string; subject: string; html: string}[]}));
vi.mock("@coreModule/utilities/emails/mailDeliveryService", () => ({
    sendMail: vi.fn(async (_companyId: string, mail: {to: string; subject: string; html: string}) => {
        sent.push(mail);
    }),
}));
vi.mock("@coreModule/environment", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@coreModule/environment")>();
    return {...actual, EMAIL: {...actual.EMAIL, ENABLED: true}, CLIENT_SIDE: {...actual.CLIENT_SIDE, NAME: "Arpeggio"}};
});

import {sendProductOrderClientMail} from "@eCommerceModule/utilities/emails/sendProductOrderClientMail";
import type {ProductOrderClientEmailEvent} from "@eCommerceModule/kafka/types";

const placed = (extra: Partial<ProductOrderClientEmailEvent> = {}, languageCode = "en-US") => sendProductOrderClientMail({
    eventType: "product_order_client_email",
    timestamp: Date.now(),
    kind: "placed",
    email: "ada@example.com",
    fullName: "Ada Lovelace",
    languageCode,
    companyId: "6ad653ec4b21ee6f13d1083a",
    companyName: "Kudoo Market",
    orderNumber: "ORD-2026-000123",
    orderTotalDisplay: "€53.00",
    ...extra,
});

const account = {holder: "Kudoo Market sh.p.k.", iban: "AL47212110090000000235698741", bic: "BKTRALTR", bankName: "BKT"};

beforeEach(() => {
    sent.length = 0;
});

// D190: a bank-transfer buyer learns from the order email where and how to pay.
describe("order placed email", () => {
    it("shows the seller's account, the amount and the order number as the reference for a bank transfer", async () => {
        await placed({bankTransfer: account});
        const {html} = sent[0];
        expect(html).toContain("Pay by bank transfer");
        expect(html).toContain("Kudoo Market sh.p.k.");
        expect(html).toContain("AL47 2121 1009 0000 0002 3569 8741");
        expect(html).toContain("BKTRALTR");
        expect(html).toContain("Payment reference");
        expect(html.split("ORD-2026-000123").length - 1).toBeGreaterThanOrEqual(2);
        expect(html).not.toMatch(/\{[a-zA-Z]+\}/);
    });

    it("is translated into Albanian", async () => {
        await placed({bankTransfer: account}, "sq-AL");
        expect(sent[0].html).toContain("Paguani me transfertë bankare");
    });

    it("says nothing about a bank transfer for another payment method", async () => {
        await placed();
        expect(sent[0].html).not.toContain("Pay by bank transfer");
        expect(sent[0].html).not.toContain("IBAN");
    });
});
