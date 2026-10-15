import {describe, expect, it} from "vitest";
import {ObjectId} from "mongodb";
import {productOrderToBuyerDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";

const order = {
    _id: new ObjectId(),
    orderNumber: "ORD-1",
    customer: new ObjectId(),
    items: [],
    subtotal: 10, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10,
    shippingAddress: {firstName: "Ada", lastName: "Lovelace", street: "1 Main", city: "Tirana"},
    status: "confirmed", paymentStatus: "paid", fulfillmentStatus: "unfulfilled",
    internalNotes: "VIP — refund without asking",
    stripePaymentIntentId: "pi_123",
    idempotencyKey: "key-1",
    timeline: [
        {event: "order_placed", timestamp: new Date("2026-10-01"), userId: new ObjectId(), note: "placed by staff"},
        {event: "stock_shortfall", timestamp: new Date("2026-10-01"), note: "SKU-1 short by 2"},
        {event: "order_confirmed", timestamp: new Date("2026-10-02")},
    ],
} as any;

describe("productOrderToBuyerDTO (storefront order routes)", () => {
    it("drops staff notes, gateway ids and the idempotency key", () => {
        const dto = productOrderToBuyerDTO(order) as Record<string, unknown>;
        expect(dto.internalNotes).toBeUndefined();
        expect(dto.stripePaymentIntentId).toBeUndefined();
        expect(dto.idempotencyKey).toBeUndefined();
        expect(dto.paymentTransactions).toBeUndefined();
        expect(dto.orderNumber).toBe("ORD-1");
    });

    it("keeps only buyer-facing timeline events, without notes or staff users", () => {
        expect(productOrderToBuyerDTO(order).timeline).toEqual([
            {event: "order_placed", timestamp: "2026-10-01T00:00:00.000Z"},
            {event: "order_confirmed", timestamp: "2026-10-02T00:00:00.000Z"},
        ]);
    });
});
