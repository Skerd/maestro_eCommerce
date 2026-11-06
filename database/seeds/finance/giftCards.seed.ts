import type {GiftCardSeedRow} from "./types";

export const giftCardsSeed: readonly GiftCardSeedRow[] = [
    {
        code: "DEMO-GIFT-50",
        initialBalance: 50,
        balance: 50,
        status: "active",
        orderNumber: "DEMO-ORD-1008",
        purchasedBy: {$user: "almir@leka.com"},
        currency: {$currency: "EUR"},
        expiresInDays: 365,
    },
];
