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
