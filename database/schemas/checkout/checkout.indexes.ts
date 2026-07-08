import {Schema} from "mongoose";

export function applyCheckoutIndexes(CheckoutSchema: Schema): void {
    CheckoutSchema.index({idempotencyKey: 1}, {unique: true});
    CheckoutSchema.index({cart: 1, company: 1});
    CheckoutSchema.index({user: 1, company: 1, status: 1});
    CheckoutSchema.index({sessionId: 1, status: 1});
    CheckoutSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});
    CheckoutSchema.index({stripePaymentIntentId: 1}, {sparse: true});
}
