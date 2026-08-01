import type {IInventoryMovement} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function inventoryMovementToSelect(movement: IInventoryMovement): ApiSelectDatum {
    return {
        value: movement._id.toString(),
        label: `${movement.reason} (${movement.quantity})`,
    };
}

export function inventoryMovementsToSelect(movements: IInventoryMovement[]): ApiSelectDatum[] {
    return movements.map(inventoryMovementToSelect);
}
