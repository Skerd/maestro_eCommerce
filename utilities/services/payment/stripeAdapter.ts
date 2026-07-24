import Stripe from "stripe";
import {PAYMENTS} from "@coreModule/environment";
import type {
    CreatePaymentIntentInput,
    CreateRefundInput,
    PaymentIntentResult,
    PaymentProviderAdapter,
    RefundResult,
    WebhookEvent,
} from "./paymentProvider.types";

/** Currencies Stripe treats as zero-decimal (amount already in minor units). */
const ZERO_DECIMAL_CURRENCIES = new Set([
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function toMinorUnits(amount: number, currencyCode: string): number {
    if (ZERO_DECIMAL_CURRENCIES.has(currencyCode.toLowerCase())) return Math.round(amount);
    return Math.round(amount * 100);
}

export class StripeAdapter implements PaymentProviderAdapter {
    readonly gateway = "stripe" as const;
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

    async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
        const intent = await this.getClient().paymentIntents.create(
            {
                amount: toMinorUnits(input.amount, input.currencyCode),
                currency: input.currencyCode.toLowerCase(),
                metadata: input.metadata,
                automatic_payment_methods: {enabled: true},
            },
            input.idempotencyKey ? {idempotencyKey: input.idempotencyKey} : undefined,
        );
        return {id: intent.id, clientSecret: intent.client_secret ?? undefined, status: intent.status};
    }

    async retrievePaymentIntent(id: string): Promise<PaymentIntentResult> {
        const intent = await this.getClient().paymentIntents.retrieve(id);
        return {id: intent.id, clientSecret: intent.client_secret ?? undefined, status: intent.status};
    }

    async createRefund(input: CreateRefundInput): Promise<RefundResult> {
        const refund = await this.getClient().refunds.create(
            {
                payment_intent: input.gatewayTransactionId,
                ...(input.amount != null ? {amount: toMinorUnits(input.amount, input.currencyCode)} : {}),
                ...(input.reason ? {metadata: {reason: input.reason}} : {}),
            },
            input.idempotencyKey ? {idempotencyKey: input.idempotencyKey} : undefined,
        );
        return {id: refund.id, status: refund.status ?? "unknown"};
    }

    constructWebhookEvent(rawBody: Buffer | string, signatureHeader: string): WebhookEvent {
        if (!PAYMENTS.STRIPE_WEBHOOK_SECRET) {
            throw new Error("stripe_webhook_secret_not_configured");
        }
        const event = this.getClient().webhooks.constructEvent(rawBody, signatureHeader, PAYMENTS.STRIPE_WEBHOOK_SECRET);
        return {id: event.id, type: event.type, data: event.data.object as unknown as Record<string, unknown>};
    }
}

export const stripeAdapter = new StripeAdapter();
