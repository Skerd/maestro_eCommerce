import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PaymentTransaction, {IPaymentTransaction} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";

export class PaymentTransactionService extends BaseCrudService<IPaymentTransaction, typeof PaymentTransaction> {
    constructor() {
        super(PaymentTransaction, "PaymentTransaction");
    }
}

export const paymentTransactionService = new PaymentTransactionService();
