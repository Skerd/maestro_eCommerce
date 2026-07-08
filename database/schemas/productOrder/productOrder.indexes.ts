import {Schema} from "mongoose";

export function applyProductOrderIndexes(ProductOrderSchema: Schema): void {
    ProductOrderSchema.index({company: 1, orderNumber: 1}, {unique: true});
    ProductOrderSchema.index({company: 1, customer: 1, createdAt: -1});
    ProductOrderSchema.index({company: 1, status: 1, createdAt: -1});
    ProductOrderSchema.index({company: 1, paymentStatus: 1});
    ProductOrderSchema.index({company: 1, fulfillmentStatus: 1});
    ProductOrderSchema.index({idempotencyKey: 1}, {unique: true});
    ProductOrderSchema.index({stripePaymentIntentId: 1}, {sparse: true});
}
