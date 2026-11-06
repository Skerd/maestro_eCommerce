import {ObjectId} from "mongodb";
import {stateService} from "@coreModule/database/schemas/state/state.service";
import {escapeRegex} from "@coreModule/utilities/helpers";

/**
 * Shipping and tax zones list their states by id, while a checkout address
 * carries the state as text (the storefront sends its name). Returns the id to
 * match zones with: the value itself when it already is one, else the id of
 * the country's state with that name, else the text unchanged (matches no zone).
 */
export async function resolveZoneState(countryId: ObjectId, state: string | undefined): Promise<string | undefined> {
    const value = state?.trim();
    if (!value) return undefined;
    if (ObjectId.isValid(value) && new ObjectId(value).toString() === value) return value;

    const match = await stateService.findOne(
        {country: countryId, name: {$regex: `^${escapeRegex(value)}$`, $options: "i"}},
        {},
        undefined,
        "_id",
    );
    return match ? String(match._id) : value;
}
