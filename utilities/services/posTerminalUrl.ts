export type PosTerminalProtocol = "http" | "https";

/** Normalize stored protocol; unknown/missing values fall back to http. */
export function normalizePosTerminalProtocol(value?: string | null): PosTerminalProtocol {
    return value === "https" ? "https" : "http";
}

/** Ensure path starts with a single leading slash. */
export function normalizePosTerminalPath(path: string | undefined | null, fallback: string): string {
    const raw = (path || fallback).trim() || fallback;
    return raw.startsWith("/") ? raw : `/${raw}`;
}

export function buildPosTerminalUrl(opts: {
    protocol?: string | null;
    host: string;
    port: number;
    path: string;
}): string {
    const protocol = normalizePosTerminalProtocol(opts.protocol);
    const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
    return `${protocol}://${opts.host}:${opts.port}${path}`;
}
