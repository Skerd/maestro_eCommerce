import type {IPaymentTransaction} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";
import type {PaymentTransaction} from "armonia/src/modules/eCommerce/api/eCommerce/private/paymentTransaction/paymentTransaction.dto";
import {mapLifeCycleToDTO, mapOwnershipToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

function mapCurrency(currency: any): PaymentTransaction["currency"] | undefined {
    if (!currency) return undefined;
    if (typeof currency === "object" && currency._id) {
        return {
            _id: currency._id.toString(),
            name: currency.name ?? "",
            symbol: currency.symbol ?? "",
            abbreviation: currency.abbreviation ?? currency.code ?? "",
            code: currency.abbreviation ?? currency.code ?? "",
        };
    }
    return {_id: currency.toString()};
}

function mapOrder(order: any): PaymentTransaction["order"] | undefined {
    if (!order) return undefined;
    if (typeof order === "object" && order._id) {
        return {
            _id: order._id.toString(),
            orderNumber: order.orderNumber ?? "",
            status: order.status,
            paymentStatus: order.paymentStatus,
            grandTotal: order.grandTotal,
        };
    }
    return {_id: order.toString()};
}

function mapCheckout(checkout: any): PaymentTransaction["checkout"] | undefined {
    if (!checkout) return undefined;
    if (typeof checkout === "object" && checkout._id) {
        return {_id: checkout._id.toString()};
    }
    return {_id: checkout.toString()};
}

function formatMoneyAmount(amount: number | undefined | null, currency?: PaymentTransaction["currency"]): string {
    const n = typeof amount === "number" ? amount : Number(amount);
    const formatted = Number.isFinite(n)
        ? n.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
        : String(amount ?? "");
    const prefix = currency?.symbol?.trim() || currency?.abbreviation?.trim() || currency?.code?.trim();
    return prefix ? `${prefix} ${formatted}` : formatted;
}

function formatMetadata(metadata: unknown): string | undefined {
    if (metadata == null) return undefined;
    if (typeof metadata !== "object") return String(metadata);
    if (Array.isArray(metadata) && metadata.length === 0) return undefined;
    if (!Array.isArray(metadata) && Object.keys(metadata as object).length === 0) return undefined;
    try {
        return JSON.stringify(metadata, null, 2);
    } catch {
        return undefined;
    }
}

export function paymentTransactionToDTO(tx: IPaymentTransaction): PaymentTransaction {
    const currency = mapCurrency(tx.currency);
    const metadata = (tx as any).metadata as Record<string, unknown> | undefined;
    const amountDisplay = formatMoneyAmount(tx.amount, currency);
    const gatewayTransactionId = tx.gatewayTransactionId;
    const displayTitle =
        (typeof gatewayTransactionId === "string" && gatewayTransactionId.trim()) ||
        amountDisplay ||
        tx._id.toString();

    return {
        _id: tx._id.toString(),
        order: mapOrder(tx.order),
        checkout: mapCheckout((tx as any).checkout),
        gateway: tx.gateway,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        amountDisplay,
        displayTitle,
        currency,
        gatewayTransactionId,
        gatewayPaymentMethodId: (tx as any).gatewayPaymentMethodId,
        failureReason: tx.failureReason,
        refundedAmount: tx.refundedAmount ?? 0,
        refundedAmountDisplay: formatMoneyAmount(tx.refundedAmount ?? 0, currency),
        metadata,
        metadataDisplay: formatMetadata(metadata),
        company: mapCompanyLabel(tx.company),
        ...mapLifeCycleToDTO(tx),
        ...mapOwnershipToDTO(tx),
    };
}

export function paymentTransactionsToDTO(txs: IPaymentTransaction[]): PaymentTransaction[] {
    return txs.map(paymentTransactionToDTO);
}
