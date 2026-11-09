import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {stateService} from "@coreModule/database/schemas/state/state.service";
import {countryService} from "@coreModule/database/schemas/country/country.service";
import {escapeRegex} from "@coreModule/utilities/helpers";

/**
 * Shipping and tax zones list their states by id, while a checkout address
 * carries the state as text (the storefront sends its name). Returns the id to
 * match zones with: the value itself when it already is one, else the id of
 * the country's state with that name, else the text unchanged (matches no zone).
 */
export async function resolveZoneState(countryId: ObjectId, state: string | undefined, session?: ClientSession): Promise<string | undefined> {
    const value = state?.trim();
    if (!value) return undefined;
    if (ObjectId.isValid(value) && new ObjectId(value).toString() === value) return value;

    const match = await stateService.findOne(
        {country: countryId, name: {$regex: `^${escapeRegex(value)}$`, $options: "i"}},
        {session},
        undefined,
        "_id",
    );
    return match ? String(match._id) : value;
}

/**
 * The seller's own country row for an address's country. Countries are rows per company, and a portal marketplace
 * address names the platform's, so the seller's tax and shipping zones are matched through the country code (TD-B88,
 * TD-B90). Inside one company's shop the address already names its own row (and another company's is out of the
 * tenant's reach).
 */
export async function sellerCountryId(countryId: ObjectId, companyId: ObjectId, session?: ClientSession): Promise<ObjectId> {
    if (await countryService.exists({_id: countryId, company: companyId}, {session})) return countryId;
    const given = await countryService.findOne({_id: countryId}, {session}, undefined, "code");
    if (!given?.code) return countryId;
    const own = await countryService.findOne({company: companyId, code: given.code}, {session}, undefined, "_id");
    return own?._id ?? countryId;
}
