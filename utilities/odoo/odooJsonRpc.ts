import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {odooJsonRpcUrl, parseOdooBaseUrl} from "./odooUrl";

export const ODOO_SEARCH_PAGE_SIZE = 200;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_SAME_HOST_REDIRECTS = 3;

export type OdooDomain = unknown[];

export type OdooSearchReadOptions = {
    fields?: string[];
    limit?: number;
    offset?: number;
};

export type OdooJsonRpcConfig = {
    url: string;
    database: string;
    username: string;
    apiKey: string;
    languageCode: string;
    fetchImpl?: typeof fetch;
};

type JsonRpcEnvelope = {
    result?: unknown;
    error?: {message?: string; data?: {message?: string}};
};

function rpcFailed(languageCode: string): never {
    throw apiValidationException("odoo_rpc_failed", "", null, languageCode);
}

function authFailed(languageCode: string): never {
    throw apiValidationException("odoo_connection_auth_failed", "", null, languageCode);
}

async function readJson(response: Response, languageCode: string): Promise<JsonRpcEnvelope> {
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        rpcFailed(languageCode);
    }
    if (!body || typeof body !== "object") rpcFailed(languageCode);
    return body as JsonRpcEnvelope;
}

function rpcResult(envelope: JsonRpcEnvelope, languageCode: string): unknown {
    if (envelope.error) rpcFailed(languageCode);
    return envelope.result;
}

async function postJsonRpc(
    endpoint: string,
    originHost: string,
    payload: Record<string, unknown>,
    languageCode: string,
    fetchImpl: typeof fetch,
): Promise<JsonRpcEnvelope> {
    let current = endpoint;
    for (let hop = 0; hop <= MAX_SAME_HOST_REDIRECTS; hop++) {
        let response: Response;
        try {
            response = await fetchImpl(current, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
                redirect: "manual",
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
        } catch {
            rpcFailed(languageCode);
        }
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) rpcFailed(languageCode);
            const next = new URL(location, current);
            if (next.host !== originHost) {
                throw apiValidationException("odoo_redirect_blocked", "url", null, languageCode);
            }
            current = next.toString();
            continue;
        }
        if (!response.ok) rpcFailed(languageCode);
        return readJson(response, languageCode);
    }
    rpcFailed(languageCode);
}

export function createOdooJsonRpcClient(config: OdooJsonRpcConfig) {
    const {database, username, apiKey, languageCode} = config;
    const fetchImpl = config.fetchImpl ?? fetch;
    const originHost = parseOdooBaseUrl(config.url, languageCode).host;
    const endpoint = odooJsonRpcUrl(config.url, languageCode);
    let callId = 1;
    let uid: number | undefined;

    async function call(service: string, method: string, args: unknown[]): Promise<unknown> {
        const envelope = await postJsonRpc(
            endpoint,
            originHost,
            {
                jsonrpc: "2.0",
                method: "call",
                params: {service, method, args},
                id: callId++,
            },
            languageCode,
            fetchImpl,
        );
        return rpcResult(envelope, languageCode);
    }

    async function authenticate(): Promise<number> {
        // Odoo JSON-RPC `password` is either an API key or the account password.
        const result = await call("common", "authenticate", [database, username, apiKey, {}]);
        if (typeof result !== "number" || result <= 0) authFailed(languageCode);
        uid = result;
        return result;
    }

    async function executeKw(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<unknown> {
        if (uid == null) await authenticate();
        return call("object", "execute_kw", [database, uid, apiKey, model, method, args, kwargs]);
    }

    async function searchCount(model: string, domain: OdooDomain = []): Promise<number> {
        const result = await executeKw(model, "search_count", [domain]);
        return typeof result === "number" ? result : 0;
    }

    const fieldNamesByModel = new Map<string, Set<string>>();

    async function fieldNames(model: string): Promise<Set<string> | null> {
        const cached = fieldNamesByModel.get(model);
        if (cached) return cached;
        const meta = await executeKw(model, "fields_get", []);
        if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
        const names = new Set(Object.keys(meta));
        names.add("id");
        fieldNamesByModel.set(model, names);
        return names;
    }

    async function usableFields(model: string, requested: string[]): Promise<string[]> {
        if (requested.length === 0) return [];
        const names = await fieldNames(model);
        if (!names) return requested;
        const present = requested.filter((field) => names.has(field));
        return present.length > 0 ? present : ["id"];
    }

    async function searchRead(
        model: string,
        domain: OdooDomain = [],
        options: OdooSearchReadOptions = {},
    ): Promise<Record<string, unknown>[]> {
        const fields = options.fields?.length
            ? await usableFields(model, options.fields)
            : [];
        const result = await executeKw(model, "search_read", [domain], {
            fields,
            limit: options.limit ?? ODOO_SEARCH_PAGE_SIZE,
            offset: options.offset ?? 0,
        });
        return Array.isArray(result) ? result.filter((row): row is Record<string, unknown> => !!row && typeof row === "object") : [];
    }

    async function searchReadAll(
        model: string,
        domain: OdooDomain = [],
        fields: string[] = [],
        pageSize = ODOO_SEARCH_PAGE_SIZE,
    ): Promise<Record<string, unknown>[]> {
        const rows: Record<string, unknown>[] = [];
        let offset = 0;
        for (;;) {
            const page = await searchRead(model, domain, {fields, limit: pageSize, offset});
            rows.push(...page);
            if (page.length < pageSize) break;
            offset += page.length;
        }
        return rows;
    }

    return {authenticate, executeKw, searchCount, searchRead, searchReadAll};
}

export type OdooJsonRpcClient = ReturnType<typeof createOdooJsonRpcClient>;
