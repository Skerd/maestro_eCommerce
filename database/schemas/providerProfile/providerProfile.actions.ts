import {action} from "@coreModule/api/actionDecorator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import ProviderProfile from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import {providerProfileService} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.service";
import {stripeConnectAdapter} from "@financeModule/utilities/services/payment/stripeConnectAdapter";
import {getECommerceMarketplaceConfig} from "@eCommerceModule/utilities/config";

type ConnectOnboardingResult = ActionMessage & {
    url?: string;
    stripeAccountId?: string;
};

type ConnectStatusResult = ActionMessage & {
    stripeAccountId?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
};

function onboardingUrls(): {returnUrl: string; refreshUrl: string} {
    const {stripeConnectReturnUrl, stripeConnectRefreshUrl} = getECommerceMarketplaceConfig();
    return {returnUrl: stripeConnectReturnUrl, refreshUrl: stripeConnectRefreshUrl};
}

export class ProviderProfileActions {
    /**
     * Starts (or resumes) Stripe Connect Express onboarding for the CURRENT
     * user's provider profile. Creates the Express account on first call and
     * returns a fresh account-link URL for the browser to follow.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
    })
    async createAccountLink(params: Record<string, any>): Promise<ConnectOnboardingResult> {
        const {logger, languageCode, session, company, actionUserCtx, userInfo} = params;

        logger.start(`Creating Stripe Connect account link for user: ${actionUserCtx.userId}...`);

        if (!stripeConnectAdapter.isEnabled()) {
            throw apiValidationException("payment_gateway_not_configured", null, null, languageCode);
        }

        const {returnUrl, refreshUrl} = onboardingUrls();
        if (!returnUrl || !refreshUrl) {
            throw apiValidationException("connect_redirect_urls_not_configured", null, null, languageCode);
        }

        const profile = await providerProfileService.findOneOrThrow(
            {user: actionUserCtx.userId, company: company._id},
            {withDeleted: false, session, logger, languageCode},
        );

        let stripeAccountId = (profile as any).stripeAccountId as string | undefined;
        if (!stripeAccountId) {
            stripeAccountId = await stripeConnectAdapter.createExpressAccount(
                (userInfo as any)?.email,
                {
                    providerProfileId: profile._id.toString(),
                    userId: actionUserCtx.userId.toString(),
                    companyId: company._id.toString(),
                },
            );
            await providerProfileService.updateByIdOrThrow(
                profile._id,
                {$set: {stripeAccountId, stripeAccountSyncedAt: new Date()}},
                {session, logger, languageCode, auditUserId: actionUserCtx.userId},
            );
        }

        const url = await stripeConnectAdapter.createAccountLink(stripeAccountId, refreshUrl, returnUrl);

        logger.finish(`Successfully created Stripe Connect account link for user: ${actionUserCtx.userId}`);

        return {message: "Connect onboarding link created", url, stripeAccountId};
    }

    /**
     * Pulls the Connect account state from Stripe and syncs the payout
     * eligibility flags onto the provider profile.
     */
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
    })
    async refreshAccountStatus(params: Record<string, any>): Promise<ConnectStatusResult> {
        const {logger, languageCode, session, company, actionUserCtx} = params;

        logger.start(`Refreshing Stripe Connect status for user: ${actionUserCtx.userId}...`);

        if (!stripeConnectAdapter.isEnabled()) {
            throw apiValidationException("payment_gateway_not_configured", null, null, languageCode);
        }

        const profile = await ProviderProfile.findOne(
            {user: actionUserCtx.userId, company: company._id},
            {stripeAccountId: 1},
            {session},
        ).noDeleted();
        if (!profile?.stripeAccountId) {
            throw apiValidationException("connect_account_not_created", null, null, languageCode);
        }

        const status = await stripeConnectAdapter.retrieveAccountStatus(profile.stripeAccountId);

        await providerProfileService.updateByIdOrThrow(
            profile._id,
            {
                $set: {
                    stripeChargesEnabled: status.chargesEnabled,
                    stripePayoutsEnabled: status.payoutsEnabled,
                    stripeDetailsSubmitted: status.detailsSubmitted,
                    stripeAccountSyncedAt: new Date(),
                },
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Successfully refreshed Stripe Connect status for user: ${actionUserCtx.userId}`);

        return {
            message: "Connect account status refreshed",
            stripeAccountId: status.accountId,
            chargesEnabled: status.chargesEnabled,
            payoutsEnabled: status.payoutsEnabled,
            detailsSubmitted: status.detailsSubmitted,
        };
    }
}
