import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {stateService} from "@coreModule/database/schemas/state/state.service";
import {countryService} from "@coreModule/database/schemas/country/country.service";
import {escapeRegex} from "@coreModule/utilities/helpers";

/**
 * Shipping and tax zones list their states by id, while a checkout address
 * carries the state as text (the storefront sends its name) or as a state row's id.
 * Returns the id to match zones with: the country's state with that name, the id
 * itself when it is a state of `countryId`, else the country's state with the same
 * name or code as the row it names (a portal address names the platform's rows,
 * the seller's zones its own, TD-B92); otherwise the value unchanged (matches no zone).
 */
export async function resolveZoneState(countryId: ObjectId, state: string | undefined, session?: ClientSession): Promise<string | undefined> {
    const value = state?.trim();
    if (!value) return undefined;
    if (!ObjectId.isValid(value) || new ObjectId(value).toString() !== value) {
        return (await stateNamed(countryId, value, session)) ?? value;
    }

    const stateId = new ObjectId(value);
    if (await stateService.exists({_id: stateId, country: countryId}, {session})) return value;
    // Another company's row is out of a tenant's reach, so this only maps inside the portal marketplace (D16)
    const given = await stateService.findOne({_id: stateId}, {session}, undefined, "name code");
    if (!given) return value;
    const byName = await stateNamed(countryId, given.name, session);
    if (byName) return byName;
    const byCode = given.code ? await stateService.findOne({country: countryId, code: given.code}, {session}, undefined, "_id") : null;
    return byCode ? String(byCode._id) : value;
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
