/**
 * Payment provider adapter contract. Gateways (Stripe today, PayPal later)
 * implement this so checkout / webhook / refund code never talks to an SDK
 * directly. Amounts are in major units (the schema-def money convention:
 * scalar number + currency objectId) — adapters convert to gateway minor
 * units internally.
 */

export interface CreatePaymentIntentInput {
    /** Major units, e.g. 19.99 */
    amount: number;
    /** ISO currency code, lowercase or uppercase (e.g. "usd") */
    currencyCode: string;
    /** Opaque ids stored on the gateway object for webhook correlation. */
    metadata: Record<string, string>;
    idempotencyKey?: string;
}

export interface PaymentIntentResult {
    id: string;
    clientSecret?: string;
    status: string;
}

export interface CreateRefundInput {
    /** Gateway id of the original charge/intent. */
    gatewayTransactionId: string;
    /** Major units. Omit for a full refund. */
    amount?: number;
    currencyCode: string;
    reason?: string;
    idempotencyKey?: string;
}

export interface RefundResult {
    id: string;
    status: string;
}

export interface WebhookEvent {
    id: string;
    type: string;
    /** Gateway-native event payload object (e.g. the PaymentIntent). */
    data: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
    readonly gateway: "stripe" | "paypal";
    isEnabled(): boolean;
    createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
    retrievePaymentIntent(id: string): Promise<PaymentIntentResult>;
    createRefund(input: CreateRefundInput): Promise<RefundResult>;
    /** Verifies the webhook signature against the raw body; throws when invalid. */
    constructWebhookEvent(rawBody: Buffer | string, signatureHeader: string): WebhookEvent;
}
