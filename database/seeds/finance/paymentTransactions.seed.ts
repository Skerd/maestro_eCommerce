import type {PaymentTransactionSeedRow} from "./types";

/**
 * Ledger rows for the eCommerce demo orders. Amounts are taken from the
 * order's `grandTotal` at seed time (except the explicit refund).
 *
 * The demo orders are paid offline (cash on delivery or bank transfer, D190), so each paid one has the manual
 * charge that Mark as paid writes; an unpaid or cancelled offline order has none.
 */
export const paymentTransactionsSeed: readonly PaymentTransactionSeedRow[] = [
    {
        seedKey: "pay-1002-succeeded",
        orderNumber: "DEMO-ORD-1002",
        gateway: "manual",
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
        gateway: "manual",
        type: "charge",
        status: "succeeded",
    },
    {
        seedKey: "pay-1005-succeeded",
        orderNumber: "DEMO-ORD-1005",
        gateway: "manual",
        type: "charge",
        status: "succeeded",
    },
    {
        seedKey: "pay-1007-charge",
        orderNumber: "DEMO-ORD-1007",
        gateway: "manual",
        type: "charge",
        status: "refunded",
        refundedAmount: 0,
    },
    {
        seedKey: "pay-1007-refund",
        orderNumber: "DEMO-ORD-1007",
        gateway: "manual",
        type: "refund",
        status: "succeeded",
    },
    {
        seedKey: "pay-1008-gift-card",
        orderNumber: "DEMO-ORD-1008",
        gateway: "manual",
        type: "charge",
        status: "succeeded",
    },
];
