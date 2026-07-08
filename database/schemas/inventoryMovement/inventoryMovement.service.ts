import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import InventoryMovement, {IInventoryMovement} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";

export class InventoryMovementService extends BaseCrudService<IInventoryMovement, typeof InventoryMovement> {
    constructor() {
        super(InventoryMovement, "InventoryMovement");
    }
}

export const inventoryMovementService = new InventoryMovementService();
