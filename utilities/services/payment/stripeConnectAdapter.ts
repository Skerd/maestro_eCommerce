import Stripe from "stripe";
import {PAYMENTS} from "@coreModule/environment";

/**
 * Stripe Connect operations for the services marketplace: Express account
 * onboarding for providers and transfers for escrow releases. Kept separate
 * from the checkout-facing PaymentProviderAdapter — Connect ops are
 * marketplace-only concerns.
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function toMinorUnits(amount: number, currencyCode: string): number {
    if (ZERO_DECIMAL_CURRENCIES.has(currencyCode.toLowerCase())) return Math.round(amount);
    return Math.round(amount * 100);
}

export type ConnectAccountStatus = {
    accountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
};

export class StripeConnectAdapter {
    private client: Stripe | null = null;

    isEnabled(): boolean {
        return PAYMENTS.STRIPE_ENABLED && Boolean(PAYMENTS.STRIPE_SECRET_KEY);
    }

    private getClient(): Stripe {
        if (!this.client) {
            if (!PAYMENTS.STRIPE_SECRET_KEY) {
                throw new Error("stripe_not_configured");
            }
            this.client = new Stripe(PAYMENTS.STRIPE_SECRET_KEY);
        }
        return this.client;
    }

    async createExpressAccount(email: string | undefined, metadata: Record<string, string>): Promise<string> {
        const account = await this.getClient().accounts.create({
            type: "express",
            email: email || undefined,
            metadata,
            capabilities: {transfers: {requested: true}},
        });
        return account.id;
    }

    async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
        const link = await this.getClient().accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: "account_onboarding",
        });
        return link.url;
    }

    async retrieveAccountStatus(accountId: string): Promise<ConnectAccountStatus> {
        const account = await this.getClient().accounts.retrieve(accountId);
        return {
            accountId: account.id,
            chargesEnabled: Boolean(account.charges_enabled),
            payoutsEnabled: Boolean(account.payouts_enabled),
            detailsSubmitted: Boolean(account.details_submitted),
        };
    }

    /**
     * Transfers the provider's share of a released escrow hold to their
     * Connect account. `sourceTransaction` ties the transfer to the charge so
     * funds availability follows the original payment.
     */
    async createTransfer(input: {
        amount: number;
        currencyCode: string;
        destinationAccountId: string;
        transferGroup?: string;
        metadata?: Record<string, string>;
        idempotencyKey?: string;
    }): Promise<string> {
        const transfer = await this.getClient().transfers.create(
            {
                amount: toMinorUnits(input.amount, input.currencyCode),
                currency: input.currencyCode.toLowerCase(),
                destination: input.destinationAccountId,
                transfer_group: input.transferGroup,
                metadata: input.metadata,
            },
            input.idempotencyKey ? {idempotencyKey: input.idempotencyKey} : undefined,
        );
        return transfer.id;
    }
}

export const stripeConnectAdapter = new StripeConnectAdapter();
