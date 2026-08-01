import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import type {Inventory} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function inventoryToDTO(inventory: IInventory): Inventory {
    const {product, variant, warehouse} = inventory;
    return {
        _id: inventory._id.toString(),
        product: {
            _id: product._id,
            title: product.title,
            sku: product.sku,
        },
        variant: variant
            ? {
                  _id: variant._id,
                  sku: variant.sku,
                  attributeCombination: variant.attributeCombination,
              }
            : undefined,
        warehouse: {
            _id: warehouse._id,
            name: warehouse.name,
            code: warehouse.code,
        },
        quantityOnHand: inventory.quantityOnHand,
        quantityReserved: inventory.quantityReserved,
        quantityAvailable: Math.max(0, inventory.quantityOnHand - inventory.quantityReserved),
        reorderPoint: inventory.reorderPoint,
        reorderQuantity: inventory.reorderQuantity,
        lowStockAlertSent: inventory.lowStockAlertSent,
        ...mapSoftDeleteToDTO(inventory),
        ...mapOwnershipToDTO(inventory),
        ...mapLifeCycleToDTO(inventory),
    };
}

export function inventoriesToDTO(inventories: IInventory[]): Inventory[] {
    return inventories.map(inventoryToDTO);
}
