import type {
    EscrowGatewayStatus,
    EscrowTransactionStatus,
    EscrowTransactionType,
} from "@financeModule/database/schemas/escrowTransaction/escrowTransaction";
import type {
    PaymentGateway,
    PaymentTransactionStatus,
    PaymentTransactionType,
} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import type {GiftCardStatus} from "@financeModule/database/schemas/giftCard/giftCard";

export type GiftCardSeedRow = {
    code: string;
    initialBalance: number;
    balance: number;
    status: GiftCardStatus;
    /** ProductOrder.orderNumber — resolved at seed time. */
    orderNumber: string;
    purchasedBy: {$user: string};
    currency: {$currency: string};
    expiresInDays: number;
};

export type PaymentTransactionSeedRow = {
    seedKey: string;
    orderNumber: string;
    gateway: PaymentGateway;
    type: PaymentTransactionType;
    status: PaymentTransactionStatus;
    /** When set, used instead of the order's grandTotal (refunds). */
    amount?: number;
    refundedAmount?: number;
    failureReason?: string;
};

export type EscrowTransactionSeedRow = {
    seedKey: string;
    /** Marketplace Order.name marker via demoSeedName / demoSeedNameCandidates(orderSeedKey). */
    orderSeedKey: string;
    /** Optional milestone `orderIndex` on that order. */
    milestoneIndex?: number;
    type: EscrowTransactionType;
    status: EscrowTransactionStatus;
    gatewayStatus: EscrowGatewayStatus;
    recipient?: "customer" | "provider" | "platform";
    /** When omitted, uses the order (or milestone) amount. */
    amount?: number;
};
