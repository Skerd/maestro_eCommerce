/**
 * ProviderProfile Service
 *
 * CRUD service for ProviderProfile model.
 */

import { ObjectId } from "mongodb";
import {BaseCrudService, CrudOptions} from "@coreModule/database/services/baseCrudService";
import ProviderProfile, {IProviderProfile} from "./providerProfile";

export class ProviderProfileService extends BaseCrudService<IProviderProfile, typeof ProviderProfile> {
    constructor() {
        super(ProviderProfile, "ProviderProfile");
    }

    /**
     * Connect account for escrow release transfers: only returned when the
     * provider finished onboarding and Stripe reports payouts enabled.
     */
    async getPayoutAccountId(
        providerUserId: ObjectId | string,
        companyId: ObjectId,
        opts: CrudOptions,
    ): Promise<string | undefined> {
        const profile = await ProviderProfile.findOne(
            {user: new ObjectId(providerUserId.toString()), company: companyId},
            {stripeAccountId: 1, stripePayoutsEnabled: 1},
            {session: opts.session},
        ).noDeleted();
        if (!profile?.stripeAccountId || !profile.stripePayoutsEnabled) return undefined;
        return profile.stripeAccountId;
    }
}

export const providerProfileService = new ProviderProfileService();
