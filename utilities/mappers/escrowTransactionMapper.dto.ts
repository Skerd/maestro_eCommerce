import { IEscrowTransaction } from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";
import { EscrowTransaction } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowTransaction.form.response.type";

export function escrowTransactionToDTO(tx: IEscrowTransaction | any): EscrowTransaction {
    return {
        _id: tx._id.toString(),
        order: tx.order ? { _id: (tx.order._id ?? tx.order).toString(), status: tx.order.status } : undefined,
        amount: typeof tx.amount === "number" ? tx.amount : parseFloat(String(tx.amount || 0)),
        currency: tx.currency
            ? {
                  _id: (tx.currency._id ?? tx.currency).toString(),
                  symbol: tx.currency.symbol,
                  abbreviation: tx.currency.abbreviation,
              }
            : undefined,
        type: tx.type,
        status: tx.status,
        recipient: tx.recipient,
        createdAt: tx.createdAt,
    };
}

export function escrowTransactionsToDTO(txs: IEscrowTransaction[]): EscrowTransaction[] {
    return txs.map(escrowTransactionToDTO);
}
