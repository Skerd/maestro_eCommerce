import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

export type TestPosTerminalConnectionResult = {
    ok: boolean;
    message: string;
    provider: string;
    terminalId?: string;
};

type TerminalMethod = {
    type?: string;
    terminalEnabled?: boolean;
    terminalProvider?: string;
    terminalHost?: string;
    terminalPort?: number;
    terminalId?: string;
    terminalPath?: string;
};

type ProbeCtx = {
    languageCode: string;
    logger?: {error?: (payload: unknown, msg?: string) => void};
};

/**
 * Probe bank POS terminal config without charging.
 * - `manual`: validates terminal is enabled; no network call.
 * - `local_http`: POSTs a probe payload to the bridge; any HTTP response means reachable.
 */
export async function testPosTerminalConnection(
    method: TerminalMethod,
    ctx: ProbeCtx,
): Promise<TestPosTerminalConnectionResult> {
    if (method.type !== "card" && method.type !== "bank") {
        throw apiValidationException("pos_terminal_not_for_method", "type", null, ctx.languageCode);
    }
    if (!method.terminalEnabled) {
        throw apiValidationException("pos_terminal_disabled", "terminalEnabled", null, ctx.languageCode);
    }

    const provider = method.terminalProvider || "manual";

    if (provider === "manual") {
        return {
            ok: true,
            provider,
            terminalId: method.terminalId,
            message: "Manual terminal mode is configured — no network probe required.",
        };
    }

    const host = (method.terminalHost || "").trim();
    const port = Number(method.terminalPort || 0);
    if (!host || !port) {
        throw apiValidationException("pos_terminal_not_configured", "terminalHost", null, ctx.languageCode);
    }

    const path = (method.terminalPath || "/payment").startsWith("/")
        ? method.terminalPath || "/payment"
        : `/${method.terminalPath || "payment"}`;
    const url = `http://${host}:${port}${path}`;
    const payload = {
        probe: true,
        test: true,
        terminalId: method.terminalId,
        reference: `POS-PROBE-${Date.now()}`,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json", Accept: "application/json"},
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        return {
            ok: true,
            provider,
            terminalId: method.terminalId,
            message: `Terminal bridge reachable at ${host}:${port} (HTTP ${res.status}).`,
        };
    } catch (err: any) {
        if (err?.name === "AbortError") {
            throw apiValidationException("pos_terminal_timeout", "terminalHost", null, ctx.languageCode);
        }
        if (err?.statusCode || err?.whatException) throw err;
        ctx.logger?.error?.({err, url}, "POS terminal connection test failed");
        throw apiValidationException("pos_terminal_unreachable", "terminalHost", null, ctx.languageCode);
    } finally {
        clearTimeout(timeout);
    }
}
