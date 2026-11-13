import type {GiftCardSeedRow} from "./types";

export const giftCardsSeed: readonly GiftCardSeedRow[] = [
    {
        code: "DEMO-GIFT-50",
        initialBalance: 50,
        balance: 50,
        status: "active",
        orderNumber: "DEMO-ORD-1008",
        // The customer of DEMO-ORD-1008, echo (a core user every dev profile has).
        purchasedBy: {$user: "echo@echo.com"},
        currency: {$currency: "EUR"},
        expiresInDays: 365,
    },
];
