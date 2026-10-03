import {Schema} from "mongoose";

export function applyCheckoutIndexes(CheckoutSchema: Schema): void {
    CheckoutSchema.index({idempotencyKey: 1}, {unique: true});
    CheckoutSchema.index({cart: 1, company: 1});
    CheckoutSchema.index({user: 1, company: 1, status: 1});
    CheckoutSchema.index({sessionId: 1, status: 1});
    // Not a TTL index: confirmed checkouts carry the order's stock reservations and
    // must outlive expiresAt. The eCommerce.checkoutExpiry cron owns expiry + purge.
    CheckoutSchema.index({status: 1, expiresAt: 1});
    CheckoutSchema.index({stripePaymentIntentId: 1}, {sparse: true});
}
