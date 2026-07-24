import {Document, model, Schema, SchemaTypes} from "mongoose";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";

/**
 * Processed payment-gateway webhook events. The unique (gateway, eventId)
 * index is what makes webhook processing idempotent: a redelivered event
 * fails the insert and is acknowledged without being re-applied.
 * System-internal — no CRUD router, no panel views.
 */
export interface IPaymentWebhookEvent extends Document {
    gateway: "stripe" | "paypal";
    eventId: string;
    eventType: string;
    processedAt: Date;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
    {
        gateway: {type: SchemaTypes.String, enum: ["stripe", "paypal"], required: true},
        eventId: {type: SchemaTypes.String, required: true},
        eventType: {type: SchemaTypes.String, required: true},
        processedAt: {type: SchemaTypes.Date, default: Date.now},
    },
    {accessMode: "loose", timestamps: true},
);

PaymentWebhookEventSchema.index({gateway: 1, eventId: 1}, {unique: true});

const PaymentWebhookEvent = model<IPaymentWebhookEvent>("PaymentWebhookEvent", PaymentWebhookEventSchema);
normalizeSchemaPermissions(PaymentWebhookEvent);
export default PaymentWebhookEvent;
