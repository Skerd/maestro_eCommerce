import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("@coreModule/utilities/middlewares/authMW", async () => (await import("@coreModule/_tests/httpHarness")).authMWStub);

import {ObjectId} from "mongodb";
import request from "supertest";
import {allPermissionTags, appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import {PUBLIC_ADDRESS, resolveTo} from "@coreModule/_tests/dnsStub";
import OdooConnectionModel from "@eCommerceModule/database/schemas/odooConnection/odooConnection";
import {basePath, router} from "@eCommerceModule/api/eCommerce/private/odooConnection";

// EC-10: a company's Odoo URL must not make the server reach its own network. Refusals come before any DB read.
const app = appFor([{basePath, router, module: "eCommerce"}]);
const caller = callerHeader({
    userId: new ObjectId().toString(),
    companyId: new ObjectId().toString(),
    permissions: allPermissionTags([OdooConnectionModel]),
});
const connection = (url: string) => ({url, database: "odoo", username: "admin", apiKeyEncrypted: "key"});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("saving and testing an Odoo connection (EC-10)", () => {
    it.each(["http://127.0.0.1:8069", "http://localhost", "http://[::1]:8069"])("refuses to save %s", async (url) => {
        const response = await request(app).put(basePath).set(caller).send(connection(url));
        expect([response.status, response.body.error_code]).toEqual([400, "url_not_public"]);
    });

    it("refuses to save a name that resolves to a private address", async () => {
        resolveTo([{address: "192.168.1.20", family: 4}]);
        const response = await request(app).put(basePath).set(caller).send(connection("https://odoo.example.ch"));
        expect([response.status, response.body.error_code]).toEqual([400, "url_not_public"]);
    });

    it.each(["http://127.0.0.1:8069", "http://localhost"])("tests %s without sending anything", async (url) => {
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const response = await request(app).post(`${basePath}/test`).set(caller).send(connection(url));
        expect([response.status, response.body.error_code]).toEqual([400, "url_not_public"]);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("tests a public server", async () => {
        resolveTo([PUBLIC_ADDRESS]);
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({jsonrpc: "2.0", result: 7, id: 1}), {headers: {"Content-Type": "application/json"}}),
        );
        const response = await request(app).post(`${basePath}/test`).set(caller).send(connection("https://odoo.example.ch"));
        expect([response.status, response.body]).toEqual([200, {ok: true}]);
        expect(fetchSpy).toHaveBeenCalledWith("https://odoo.example.ch/jsonrpc", expect.objectContaining({method: "POST"}));
    });
});
