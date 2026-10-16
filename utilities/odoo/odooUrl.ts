import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function parseOdooBaseUrl(url: string, languageCode: string): URL {
    let parsed: URL;
    try {
        parsed = new URL(url.trim());
    } catch {
        throw apiValidationException("odoo_connection_url_invalid", "url", null, languageCode);
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || parsed.username || parsed.password) {
        throw apiValidationException("odoo_connection_url_invalid", "url", null, languageCode);
    }
    return parsed;
}

export function odooJsonRpcUrl(url: string, languageCode: string): string {
    const parsed = parseOdooBaseUrl(url, languageCode);
    return `${parsed.origin}/jsonrpc`;
}
