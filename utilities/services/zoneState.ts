import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {stateService} from "@coreModule/database/schemas/state/state.service";
import {escapeRegex} from "@coreModule/utilities/helpers";

/**
 * Shipping and tax zones list their states by id, while a checkout address carries the state as text (the storefront
 * sends its name) or as a state row's id. Returns the id to match zones with: the country's state with that name, or
 * the id itself (states are a platform list, D160, so every seller's zones name the same rows); otherwise the value
 * unchanged (matches no zone).
 */
export async function resolveZoneState(countryId: ObjectId, state: string | undefined, session?: ClientSession): Promise<string | undefined> {
    const value = state?.trim();
    if (!value) return undefined;
    if (!ObjectId.isValid(value) || new ObjectId(value).toString() !== value) {
        return (await stateNamed(countryId, value, session)) ?? value;
    }
    return value;
}

/** The id of `countryId`'s state called `name` (any case). */
async function stateNamed(countryId: ObjectId, name: string, session?: ClientSession): Promise<string | undefined> {
    const match = await stateService.findOne(
        {country: countryId, name: {$regex: `^${escapeRegex(name)}$`, $options: "i"}},
        {session},
        undefined,
        "_id",
    );
    return match ? String(match._id) : undefined;
}
