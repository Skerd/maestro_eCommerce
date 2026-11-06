import type {PaymentTransactionSeedRow} from "./types";

/**
 * Ledger rows for the eCommerce demo orders. Amounts are taken from the
 * order's `grandTotal` at seed time (except the explicit refund).
 *
 * Live gateway ids / client secrets are never carried over.
 */
export const paymentTransactionsSeed: readonly PaymentTransactionSeedRow[] = [
    {
        seedKey: "pay-1001-pending",
        orderNumber: "DEMO-ORD-1001",
        gateway: "stripe",
        type: "charge",
        status: "pending",
    },
    {
        seedKey: "pay-1002-succeeded",
        orderNumber: "DEMO-ORD-1002",
        gateway: "stripe",
        type: "charge",
        status: "succeeded",
    },
    {
        seedKey: "pay-1003-succeeded",
        orderNumber: "DEMO-ORD-1003",
        gateway: "manual",
        type: "charge",
        status: "succeeded",
    },
    {
        seedKey: "pay-1004-succeeded",
        orderNumber: "DEMO-ORD-1004",
        gateway: "stripe",
        type: "charge",
        status: "succeeded",
    },
    {
        seedKey: "pay-1005-succeeded",
        orderNumber: "DEMO-ORD-1005",
        gateway: "stripe",
        type: "charge",
        status: "succeeded",
    },
    {
        seedKey: "pay-1006-failed",
        orderNumber: "DEMO-ORD-1006",
        gateway: "stripe",
        type: "charge",
        status: "failed",
        failureReason: "Customer cancelled before the charge captured.",
    },
    {
        seedKey: "pay-1007-charge",
        orderNumber: "DEMO-ORD-1007",
        gateway: "stripe",
        type: "charge",
        status: "refunded",
        refundedAmount: 0,
    },
    {
        seedKey: "pay-1007-refund",
        orderNumber: "DEMO-ORD-1007",
        gateway: "stripe",
        type: "refund",
        status: "succeeded",
    },
    {
        seedKey: "pay-1008-gift-card",
        orderNumber: "DEMO-ORD-1008",
        gateway: "stripe",
        type: "charge",
        status: "succeeded",
    },
];
