import {describe, expect, it, vi} from "vitest";
import {ServerError} from "armonia/src/modules/core/types";
import {createOdooJsonRpcClient, ODOO_SEARCH_PAGE_SIZE} from "../utilities/odoo/odooJsonRpc";
import {odooJsonRpcUrl, parseOdooBaseUrl} from "../utilities/odoo/odooUrl";

function jsonResponse(body: unknown, init: {status?: number; headers?: Record<string, string>} = {}): Response {
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: {"Content-Type": "application/json", ...init.headers},
    });
}

describe("odoo json-rpc url", () => {
    it("posts to origin/jsonrpc and rejects userinfo", () => {
        expect(odooJsonRpcUrl("https://shop.example.com/web", "en-US")).toBe("https://shop.example.com/jsonrpc");
        expect(() => parseOdooBaseUrl("https://user:secret@shop.example.com", "en-US")).toThrow(ServerError);
    });
});

describe("odoo json-rpc client", () => {
    it("authenticates and pages search_read until a short page", async () => {
        const calls: unknown[] = [];
        const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
            const payload = JSON.parse(String(init?.body)) as {params: {method: string; args: unknown[]}};
            calls.push(payload.params.method);
            if (payload.params.method === "authenticate") {
                return jsonResponse({jsonrpc: "2.0", result: 7, id: 1});
            }
            const odooMethod = payload.params.args[4];
            if (odooMethod === "fields_get") {
                return jsonResponse({jsonrpc: "2.0", result: {id: {type: "integer"}}, id: 2});
            }
            const kwargs = payload.params.args[6] as {offset?: number; limit?: number};
            const offset = kwargs.offset ?? 0;
            const rows = offset === 0
                ? Array.from({length: ODOO_SEARCH_PAGE_SIZE}, (_, i) => ({id: i + 1}))
                : [{id: ODOO_SEARCH_PAGE_SIZE + 1}];
            return jsonResponse({jsonrpc: "2.0", result: rows, id: 2});
        });
        const client = createOdooJsonRpcClient({
            url: "https://shop.example.com",
            database: "odoo",
            username: "admin",
            apiKey: "key",
            languageCode: "en-US",
            fetchImpl: fetchImpl as typeof fetch,
        });
        const rows = await client.searchReadAll("product.category", [], ["id"]);
        expect(calls[0]).toBe("authenticate");
        expect(rows).toHaveLength(ODOO_SEARCH_PAGE_SIZE + 1);
        expect(rows[0]).toEqual({id: 1});
    });

    it("rejects a false authenticate result", async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({jsonrpc: "2.0", result: false, id: 1}));
        const client = createOdooJsonRpcClient({
            url: "https://shop.example.com",
            database: "odoo",
            username: "admin",
            apiKey: "bad",
            languageCode: "en-US",
            fetchImpl: fetchImpl as typeof fetch,
        });
        await expect(client.authenticate()).rejects.toMatchObject({error_code: "odoo_connection_auth_failed"});
    });

    it("blocks a redirect to another host", async () => {
        const fetchImpl = vi.fn(async () => new Response(null, {
            status: 302,
            headers: {location: "https://evil.example/jsonrpc"},
        }));
        const client = createOdooJsonRpcClient({
            url: "https://shop.example.com",
            database: "odoo",
            username: "admin",
            apiKey: "key",
            languageCode: "en-US",
            fetchImpl: fetchImpl as typeof fetch,
        });
        await expect(client.authenticate()).rejects.toMatchObject({error_code: "odoo_redirect_blocked"});
    });

    it("omits fields that fields_get does not list before search_read", async () => {
        const searchFields: string[][] = [];
        const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
            const payload = JSON.parse(String(init?.body)) as {params: {method: string; args: unknown[]}};
            if (payload.params.method === "authenticate") {
                return jsonResponse({jsonrpc: "2.0", result: 7, id: 1});
            }
            const odooMethod = payload.params.args[4];
            if (odooMethod === "fields_get") {
                return jsonResponse({jsonrpc: "2.0", result: {id: {type: "integer"}, name: {type: "char"}}, id: 2});
            }
            const kwargs = payload.params.args[6] as {fields?: string[]};
            searchFields.push(kwargs.fields ?? []);
            return jsonResponse({jsonrpc: "2.0", result: [{id: 1, name: "All"}], id: 3});
        });
        const client = createOdooJsonRpcClient({
            url: "https://shop.example.com",
            database: "odoo",
            username: "admin",
            apiKey: "key",
            languageCode: "en-US",
            fetchImpl: fetchImpl as typeof fetch,
        });
        const rows = await client.searchReadAll("product.category", [], ["id", "name", "sequence"]);
        expect(searchFields[0]).toEqual(["id", "name"]);
        expect(rows).toEqual([{id: 1, name: "All"}]);
    });
});
