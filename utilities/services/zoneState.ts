import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {stateService} from "@coreModule/database/schemas/state/state.service";
import {cityService} from "@coreModule/database/schemas/city/city.service";
import {escapeRegex} from "@coreModule/utilities/helpers";

/**
 * Shipping and tax zones list their states by id, while a checkout address carries the state as text: its name (what
 * the storefront offers), its code (`TR`), or a state row's id; it may also leave the state out. Returns the id to
 * match zones with, so a zone limited to states matches however the address names it:
 * - the state the address names, by id, name or code, within the country;
 * - otherwise the state of the address's city (a city row knows its state), by id or name within the country;
 * - otherwise the text unchanged, which matches no zone limited to states.
 * States and cities are platform lists (D160), so every seller's zones name the same rows.
 */
export async function resolveZoneState(
    countryId: ObjectId,
    state: string | undefined,
    session?: ClientSession,
    city?: string,
): Promise<string | undefined> {
    const value = state?.trim();
    const named = value ? await stateOf(countryId, value, session) : undefined;
    if (named) return named;
    const fromCity = city?.trim() ? await stateOfCity(countryId, city.trim(), session) : undefined;
    return fromCity ?? (value || undefined);
}

function isId(value: string): boolean {
    return ObjectId.isValid(value) && new ObjectId(value).toString() === value;
}

function exactly(text: string) {
    return {$regex: `^${escapeRegex(text)}$`, $options: "i"};
}

/** The id of `countryId`'s state that `value` names: its id, its name or its code (any case). */
async function stateOf(countryId: ObjectId, value: string, session?: ClientSession): Promise<string | undefined> {
    const match = await stateService.findOne(
        isId(value)
            ? {country: countryId, _id: new ObjectId(value)}
            : {country: countryId, $or: [{name: exactly(value)}, {code: exactly(value)}]},
        {session},
        undefined,
        "_id",
    );
    return match ? String(match._id) : undefined;
}

/** The state of `countryId`'s city that `value` names (its id or its name, any case), when the city row has one. */
async function stateOfCity(countryId: ObjectId, value: string, session?: ClientSession): Promise<string | undefined> {
    const match = await cityService.findOne(
        isId(value) ? {country: countryId, _id: new ObjectId(value)} : {country: countryId, name: exactly(value)},
        {session},
        undefined,
        "state",
    );
    return match?.state ? String(match.state) : undefined;
}
