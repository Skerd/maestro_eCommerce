import {createHash} from "crypto";
import forge from "node-forge";
import {describe, expect, it} from "vitest";
import {getIIC, loadPkcs12} from "@eCommerceModule/utilities/fiscalization/fiscalSoap";

/** A throwaway self-signed PKCS#12 certificate, as a fiscal config stores it (base64). */
function testCertificate(password: string): string {
    const keys = forge.pki.rsa.generateKeyPair({bits: 1024, e: 0x10001});
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
    cert.setSubject([{name: "commonName", value: "Test seller"}]);
    cert.setIssuer([{name: "commonName", value: "Test seller"}]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {algorithm: "3des"});
    return forge.util.encode64(forge.asn1.toDer(p12).getBytes());
}

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

// TD-B77: a sale resolved from the CIS portal has its IIC signature recomputed, which holds only if signing repeats.
describe("IIC signing", () => {
    it("signs the same input to the same signature, whose MD5 is the IIC", () => {
        const certificate = testCertificate("secret");
        const input = "L12345678A|2026-11-09T10:00:00+01:00|7|BU1|TCR1|SC1|12.00";

        const first = getIIC(input, certificate, "secret", "en-US");
        const again = getIIC(input, certificate, "secret", "en-US");

        expect(again).toEqual(first);
        expect(first.iic).toBe(createHash("md5").update(Buffer.from(first.iicSignature, "hex")).digest("hex").toUpperCase());
        expect(getIIC(input.replace("10:00:00", "10:00:01"), certificate, "secret", "en-US").iic).not.toBe(first.iic);
    });
});
