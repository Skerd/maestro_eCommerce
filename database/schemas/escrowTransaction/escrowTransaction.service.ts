/**
 * EscrowTransaction Service
 *
 * CRUD service for EscrowTransaction model.
 */

import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import EscrowTransaction, {
    IEscrowTransaction,
    EscrowTransactionType,
    EscrowTransactionStatus,
} from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";

export const SERVICE_FEE_PERCENT = 10; // Platform fee percentage

export class EscrowTransactionService extends BaseCrudService<IEscrowTransaction, typeof EscrowTransaction> {
    constructor() {
        super(EscrowTransaction, "EscrowTransaction");
    }
}

export const escrowTransactionService = new EscrowTransactionService();
