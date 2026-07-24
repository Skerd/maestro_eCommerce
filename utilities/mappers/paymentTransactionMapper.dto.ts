import type {IPaymentTransaction} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";
import type {PaymentTransaction} from "armonia/src/modules/eCommerce/api/eCommerce/private/paymentTransaction/paymentTransaction.dto";
import {mapOwnershipToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function paymentTransactionToDTO(tx: IPaymentTransaction): PaymentTransaction {
    return {
        _id: tx._id.toString(),
        order: {_id: (tx.order as any)?._id?.toString() ?? tx.order?.toString() ?? ""},
        gateway: tx.gateway,
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency ? {_id: (tx.currency as any)?._id?.toString() ?? tx.currency.toString(), code: (tx.currency as any)?.code} : undefined,
        gatewayTransactionId: tx.gatewayTransactionId,
        failureReason: tx.failureReason,
        refundedAmount: tx.refundedAmount,
        company: mapCompanyLabel(tx.company),
        ...mapOwnershipToDTO(tx),
    };
}

export function paymentTransactionsToDTO(txs: IPaymentTransaction[]): PaymentTransaction[] {
    return txs.map(paymentTransactionToDTO);
}
