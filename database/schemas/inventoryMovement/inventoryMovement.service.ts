import {ObjectId} from "mongodb";
import {BaseCrudService, type CrudOptions} from "@coreModule/database/services/baseCrudService";
import InventoryMovement, {IInventoryMovement, type InventoryMovementReason} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";

/**
 * Ledger insert. Refs are stored as ObjectIds. `IInventoryMovement` types the
 * same fields as populated documents, so the write shape lives here.
 */
export type InventoryMovementWrite = {
    inventory?: ObjectId;
    product: ObjectId;
    variant?: ObjectId;
    warehouse: ObjectId;
    quantity: number;
    reason: InventoryMovementReason;
    note?: string;
    quantityBefore: number;
    quantityAfter: number;
    manufacturer?: string;
    receiptNumber?: string;
    receipts?: ObjectId[];
    occurredAt?: Date;
    unitCost?: number;
    batchLot?: string;
    expiryDate?: Date;
    performedBy?: ObjectId | string;
    referenceType?: string;
    referenceId?: ObjectId;
    company: ObjectId;
};

export class InventoryMovementService extends BaseCrudService<IInventoryMovement, typeof InventoryMovement> {
    constructor() {
        super(InventoryMovement, "InventoryMovement");
    }

    override create(data: InventoryMovementWrite, options: CrudOptions = {}): Promise<IInventoryMovement> {
        return super.create(data as Partial<IInventoryMovement>, options);
    }
}

export const inventoryMovementService = new InventoryMovementService();
