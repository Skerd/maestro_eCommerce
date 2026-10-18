import type {IProviderProfile} from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import type {ProviderProfile} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/providerProfile.dto";
import type {SimpleUser} from "armonia/src/modules/core/dto/user.dto";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {mapMedia, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {mapLifeCycleToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function providerProfileToDTO(
    profile: IProviderProfile | null,
    metrics?: { averageRating?: number; reviewCount?: number; completionRate?: number }
): ProviderProfile | null {
    if (!profile) return null;

    const portfolio = (profile.portfolio || []).map(mapMedia);
    const availability = (profile.availability || []).map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
    }));

    return {
        _id: profile._id?.toString?.(),
        user: mapSnippet<SimpleUser>()(profile.user, SimpleUserSnippet),
        skills: profile.skills || [],
        bio: profile.bio,
        portfolio: portfolio.length ? portfolio : undefined,
        availability,
        averageRating: metrics?.averageRating,
        reviewCount: metrics?.reviewCount,
        completionRate: metrics?.completionRate,
        stripeAccountId: (profile as any).stripeAccountId || undefined,
        stripeChargesEnabled: !!(profile as any).stripeChargesEnabled,
        stripePayoutsEnabled: !!(profile as any).stripePayoutsEnabled,
        stripeDetailsSubmitted: !!(profile as any).stripeDetailsSubmitted,
        stripeAccountSyncedAt: (profile as any).stripeAccountSyncedAt
            ? new Date((profile as any).stripeAccountSyncedAt).toISOString()
            : undefined,
        ...mapLifeCycleToDTO(profile),
    };
}

export function providerProfilesToDTOArray(profiles: IProviderProfile[]): ProviderProfile[] {
    return profiles.map((profile) => providerProfileToDTO(profile)!).filter(Boolean);
}
