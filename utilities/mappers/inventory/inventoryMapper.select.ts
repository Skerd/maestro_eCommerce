import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function inventoryToSelect(inventory: IInventory): ApiSelectDatum {
    const productLabel = inventory.product?.title ?? String(inventory.product?._id ?? inventory.product ?? "");
    const warehouseLabel = inventory.warehouse?.name ?? String(inventory.warehouse?._id ?? inventory.warehouse ?? "");
    return {
        value: inventory._id.toString(),
        label: `${productLabel} @ ${warehouseLabel}`,
    };
}

export function inventoriesToSelect(inventories: IInventory[]): ApiSelectDatum[] {
    return inventories.map(inventoryToSelect);
}
