import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {IPosCompanyPosLock} from "@eCommerceModule/database/schemas/posCompanyPosLock/posCompanyPosLock";
import {posCompanyPosLockService} from "@eCommerceModule/database/schemas/posCompanyPosLock/posCompanyPosLock.service";
import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posPaymentMethodService} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.service";
import {pushWebsocketMessage} from "@coreModule/connections/connectToWebSocketServer";
import {ECommerceWebSocketMessageCodes} from "armonia/src/modules/eCommerce/websocket/types";
import {buildPosTerminalUrl, normalizePosTerminalPath} from "./posTerminalUrl";

type LoggerLike = {info?: (...a: any[]) => void; warn?: (...a: any[]) => void; error?: (...a: any[]) => void};

export type PosKillReason = "pause" | "pauseAll" | "deactivate";

export type PosGateCtx = {
    languageCode: string;
    company: {_id: ObjectId | string};
    session?: ClientSession | null;
    logger?: LoggerLike;
    userId?: ObjectId | string;
};

export async function getCompanyPosLock(
    companyId: ObjectId | string,
    session?: ClientSession | null,
): Promise<IPosCompanyPosLock | null> {
    return posCompanyPosLockService.findForCompany(companyId, session);
}

export function isCompanyPosLockActive(lock: IPosCompanyPosLock | null | undefined): boolean {
    return !!lock?.pausedAt;
}

export async function isCompanyPosLocked(
    companyId: ObjectId | string,
    session?: ClientSession | null,
): Promise<boolean> {
    return isCompanyPosLockActive(await getCompanyPosLock(companyId, session));
}

/**
 * Throws when the till must not accept money-moving mutations.
 * Call after loading the PosConfig for the operation.
 */
export async function assertPosTillMutable(config: IPosConfig, ctx: PosGateCtx): Promise<void> {
    if (!config.isActive) {
        throw apiValidationException("pos_config_inactive", "configId", null, ctx.languageCode);
    }
    if (config.pausedAt) {
        throw apiValidationException("pos_config_paused", "configId", null, ctx.languageCode);
    }
    if (await isCompanyPosLocked(ctx.company._id, ctx.session)) {
        throw apiValidationException("pos_config_paused", "configId", null, ctx.languageCode);
    }
}

export async function assertPosConfigOpenable(config: IPosConfig, ctx: PosGateCtx): Promise<void> {
    await assertPosTillMutable(config, ctx);
}

// ─── In-flight terminal registry (best-effort void) ─────────────────────────

export type InFlightTerminalCharge = {
    sessionId: string;
    paymentMethodId: string;
    companyId: string;
    reference: string;
    provider: string;
    protocol?: string;
    host?: string;
    port?: number;
    cancelPath?: string;
    amount: number;
    currency?: string;
    terminalId?: string;
};

const inFlightTerminalCharges = new Map<string, InFlightTerminalCharge>();

function terminalFlightKey(sessionId: string, reference: string): string {
    return `${sessionId}::${reference}`;
}

export function registerInFlightTerminalCharge(entry: InFlightTerminalCharge): void {
    inFlightTerminalCharges.set(terminalFlightKey(entry.sessionId, entry.reference), entry);
}

export function clearInFlightTerminalCharge(sessionId: string, reference: string): void {
    inFlightTerminalCharges.delete(terminalFlightKey(sessionId, reference));
}

export function listInFlightTerminalChargesForSessions(sessionIds: string[]): InFlightTerminalCharge[] {
    const idSet = new Set(sessionIds.map(String));
    const out: InFlightTerminalCharge[] = [];
    for (const entry of inFlightTerminalCharges.values()) {
        if (idSet.has(entry.sessionId)) out.push(entry);
    }
    return out;
}

async function voidLocalHttpTerminal(entry: InFlightTerminalCharge, logger?: LoggerLike): Promise<void> {
    if (entry.provider !== "local_http" || !entry.host || !entry.port) return;
    const path = normalizePosTerminalPath(entry.cancelPath, "/cancel");
    const url = buildPosTerminalUrl({
        protocol: entry.protocol,
        host: entry.host,
        port: entry.port,
        path,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
        await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json", Accept: "application/json"},
            body: JSON.stringify({
                action: "cancel",
                reference: entry.reference,
                amount: entry.amount,
                currency: entry.currency || "EUR",
                terminalId: entry.terminalId,
                sessionId: entry.sessionId,
                paymentMethodId: entry.paymentMethodId,
            }),
            signal: controller.signal,
        });
    } catch (err: any) {
        logger?.warn?.({err, url, reference: entry.reference}, "POS terminal cancel best-effort failed");
    } finally {
        clearTimeout(timeout);
        clearInFlightTerminalCharge(entry.sessionId, entry.reference);
    }
}

export async function voidInFlightTerminalsForSessions(
    sessionIds: string[],
    logger?: LoggerLike,
): Promise<void> {
    const entries = listInFlightTerminalChargesForSessions(sessionIds);
    await Promise.all(
        entries.map(async (entry) => {
            if (entry.provider === "manual") {
                clearInFlightTerminalCharge(entry.sessionId, entry.reference);
                return;
            }
            await voidLocalHttpTerminal(entry, logger);
        }),
    );
}

// ─── Force-close ────────────────────────────────────────────────────────────

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function forceClosePosSession(
    sessionId: ObjectId | string,
    reason: PosKillReason,
    ctx: PosGateCtx,
): Promise<void> {
    const sessionDoc = await posSessionService.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }, {session: ctx.session ?? undefined, withDeleted: false});
    if (!sessionDoc) return;
    if (sessionDoc.state === "closed") return;

    await posOrderService.updateMany(
        {
            company: ctx.company._id,
            session: sessionDoc._id,
            state: "draft",
        },
        {$set: {state: "cancel"}},
        {session: ctx.session ?? undefined, withDeleted: false},
    );

    const expectedCash = round2(Number(sessionDoc.expectedCash ?? 0));
    const now = new Date();
    sessionDoc.state = "closed";
    sessionDoc.closedBy = (ctx.userId as any) ?? sessionDoc.openedBy;
    sessionDoc.closedAt = now;
    sessionDoc.closingBalance = expectedCash;
    const forceNote = `force-closed: ${reason}`;
    sessionDoc.notes = sessionDoc.notes?.trim()
        ? `${sessionDoc.notes.trim()} | ${forceNote}`
        : forceNote;
    await sessionDoc.save({session: ctx.session});
}

export type KillPipelineResult = {
    configIds: string[];
    sessionIds: string[];
    cashierUserIds: string[];
};

export async function forceCloseOpenSessionsForConfig(
    configId: ObjectId | string,
    reason: PosKillReason,
    ctx: PosGateCtx,
): Promise<KillPipelineResult> {
    const sessions = await posSessionService.find({
        company: ctx.company._id,
        config: configId,
        state: {$in: ["opening_control", "opened", "closing_control"]},
    }, {session: ctx.session ?? undefined, withDeleted: false}, undefined, "_id openedBy");

    const sessionIds = sessions.map((s) => s._id.toString());
    const cashierUserIds = [
        ...new Set(
            sessions
                .map((s) => nestedEntityToRef(s.openedBy)?.toString())
                .filter((id): id is string => !!id),
        ),
    ];

    await voidInFlightTerminalsForSessions(sessionIds, ctx.logger);

    for (const s of sessions) {
        try {
            await forceClosePosSession(s._id, reason, ctx);
        } catch (err: any) {
            ctx.logger?.error?.(
                {err, sessionId: s._id.toString(), reason},
                "POS force-close failed for session",
            );
        }
    }

    return {
        configIds: [String(configId)],
        sessionIds,
        cashierUserIds,
    };
}

export async function forceCloseOpenSessionsForConfigs(
    configIds: (ObjectId | string)[],
    reason: PosKillReason,
    ctx: PosGateCtx,
): Promise<KillPipelineResult> {
    const merged: KillPipelineResult = {configIds: [], sessionIds: [], cashierUserIds: []};
    for (const id of configIds) {
        const part = await forceCloseOpenSessionsForConfig(id, reason, ctx);
        merged.configIds.push(...part.configIds);
        merged.sessionIds.push(...part.sessionIds);
        merged.cashierUserIds.push(...part.cashierUserIds);
    }
    merged.cashierUserIds = [...new Set(merged.cashierUserIds)];
    return merged;
}

export function notifyPosTillsKilled(opts: {
    configIds: string[];
    sessionIds: string[];
    cashierUserIds: string[];
    reason: PosKillReason;
    pauseReason?: string | null;
    companyWide?: boolean;
}): void {
    const {configIds, sessionIds, cashierUserIds, reason, pauseReason, companyWide} = opts;
    if (!cashierUserIds.length && !configIds.length) return;

    const pausedPayload = {
        configIds,
        sessionIds,
        reason,
        pauseReason: pauseReason ?? null,
        companyWide: !!companyWide,
    };

    if (cashierUserIds.length) {
        pushWebsocketMessage({
            code: ECommerceWebSocketMessageCodes.POS_CONFIG_PAUSED,
            payload: pausedPayload,
            userIds: cashierUserIds,
        });
        pushWebsocketMessage({
            code: ECommerceWebSocketMessageCodes.POS_SESSION_FORCE_CLOSED,
            payload: pausedPayload,
            userIds: cashierUserIds,
        });
    }
}

export async function upsertCompanyPosLock(
    companyId: ObjectId | string,
    fields: {pausedAt: Date | null; pausedBy: ObjectId | null; pauseReason: string | null},
    session?: ClientSession | null,
): Promise<IPosCompanyPosLock> {
    const doc = await posCompanyPosLockService.setForCompany(companyId, fields, session);
    return doc!;
}

/** Resolve terminal cancel path from payment method for in-flight registry. */
export async function resolveTerminalCancelMeta(
    paymentMethodId: string,
    companyId: ObjectId | string,
    session?: ClientSession | null,
): Promise<{
    provider: string;
    protocol?: string;
    host?: string;
    port?: number;
    cancelPath?: string;
    terminalId?: string;
} | null> {
    const method = await posPaymentMethodService.findOne({
        _id: paymentMethodId,
        company: companyId,
    }, {session: session ?? undefined, withDeleted: false});
    if (!method) return null;
    return {
        provider: method.terminalProvider || "manual",
        protocol: method.terminalProtocol || undefined,
        host: method.terminalHost || undefined,
        port: method.terminalPort || undefined,
        cancelPath: "/cancel",
        terminalId: method.terminalId || undefined,
    };
}
