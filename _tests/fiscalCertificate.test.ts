import {describe, expect, it} from "vitest";
import {loadPkcs12} from "@eCommerceModule/utilities/fiscalization/fiscalSoap";

// An unreadable certificate is a configuration problem the merchant fixes, so it answers a key, not a 500.
describe("fiscal certificate loading", () => {
    it("refuses a file that is not a PKCS#12 certificate with fiscal_certificate_invalid", () => {
        let thrown: unknown;
        try {
            loadPkcs12(Buffer.from("not a certificate").toString("base64"), "secret", "en-US");
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toMatchObject({error_code: "fiscal_certificate_invalid"});
    });
});
