import bcrypt from "bcrypt";
import {ObjectId} from "mongodb";
import type {IPosConfig, IPosManagerPin} from "@eCommerceModule/database/schemas/posConfig/posConfig";

export function userRefId(ref: any): string {
    if (!ref) return "";
    if (typeof ref === "object" && ref._id) return ref._id.toString();
    return ref.toString();
}

export function getManagerPins(config: IPosConfig | Record<string, any>): IPosManagerPin[] {
    return (((config as any).managerPins as IPosManagerPin[] | undefined) ?? []).slice();
}

export function findManagerPin(
    config: IPosConfig | Record<string, any>,
    userId: string,
): IPosManagerPin | undefined {
    const id = String(userId);
    return getManagerPins(config).find((p) => userRefId(p.user) === id);
}

export function isAssignedManager(config: IPosConfig | Record<string, any>, userId: string): boolean {
    const id = String(userId);
    const managers = ((config as any).managers as any[] | undefined) ?? [];
    return managers.some((m) => userRefId(m) === id);
}

export function hasAnyManagerPin(config: IPosConfig | Record<string, any>): boolean {
    return getAssignedManagerPins(config).some((p) => !!p.pinHash);
}

/** PIN rows that still belong to users in `managers`. */
export function getAssignedManagerPins(
    config: IPosConfig | Record<string, any>,
): IPosManagerPin[] {
    const assigned = new Set(
        (((config as any).managers as any[] | undefined) ?? [])
            .map((m) => userRefId(m))
            .filter(Boolean),
    );
    return getManagerPins(config).filter((p) => !!p.pinHash && assigned.has(userRefId(p.user)));
}

/** Keep pin rows only for users still in `managers`. */
export function pruneManagerPinsToAssigned(
    config: IPosConfig | Record<string, any>,
): IPosManagerPin[] {
    const assigned = new Set(
        (((config as any).managers as any[] | undefined) ?? [])
            .map((m) => userRefId(m))
            .filter(Boolean),
    );
    return getManagerPins(config).filter((p) => assigned.has(userRefId(p.user)));
}

export function upsertManagerPin(
    config: IPosConfig | Record<string, any>,
    userId: string,
    patch: Partial<Pick<IPosManagerPin, "pinHash" | "pinReset">>,
    opts?: {unsetPinReset?: boolean; removePinHash?: boolean},
): IPosManagerPin[] {
    const id = String(userId);
    const pins = getManagerPins(config);
    const idx = pins.findIndex((p) => userRefId(p.user) === id);
    const base: IPosManagerPin =
        idx >= 0 ? {...pins[idx], user: pins[idx].user} : {user: new ObjectId(id)};

    const next: IPosManagerPin = {
        ...base,
        ...patch,
        user: base.user ?? new ObjectId(id),
    };
    if (opts?.removePinHash) {
        delete next.pinHash;
    }
    if (opts?.unsetPinReset) {
        delete next.pinReset;
    }

    if (idx >= 0) pins[idx] = next;
    else pins.push(next);
    return pins;
}

export function removeManagerPin(
    config: IPosConfig | Record<string, any>,
    userId: string,
): IPosManagerPin[] {
    const id = String(userId);
    return getManagerPins(config).filter((p) => userRefId(p.user) !== id);
}

/**
 * Accepts a PIN only if it matches an assigned manager who still has a PIN set.
 * Prefer {@link managerPinMatchesForUser} when the till has selected a specific manager.
 */
export async function managerPinMatches(
    config: IPosConfig | Record<string, any>,
    pin: string,
): Promise<boolean> {
    const trimmed = String(pin || "").trim();
    if (!trimmed) return false;
    for (const entry of getAssignedManagerPins(config)) {
        if (await bcrypt.compare(trimmed, entry.pinHash!)) return true;
    }
    return false;
}

/**
 * Verifies PIN for one assigned manager. Returns that manager's user id on success.
 */
export async function managerPinMatchesForUser(
    config: IPosConfig | Record<string, any>,
    managerId: string,
    pin: string,
): Promise<string | null> {
    const id = String(managerId || "").trim();
    const trimmed = String(pin || "").trim();
    if (!id || !trimmed) return null;
    if (!isAssignedManager(config, id)) return null;
    const entry = findManagerPin(config, id);
    if (!entry?.pinHash) return null;
    if (!(await bcrypt.compare(trimmed, entry.pinHash))) return null;
    return id;
}
