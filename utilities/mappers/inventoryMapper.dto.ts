import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import type {Inventory} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.dto";
import {mapOwnershipToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function inventoryToDTO(inventory: IInventory): Inventory {
    const product = inventory.product as any;
    const variant = inventory.variant as any;
    const warehouse = inventory.warehouse as any;
    return {
        _id: inventory._id.toString(),
        product: {
            _id: product?._id?.toString() ?? product?.toString() ?? "",
            title: product?.title ?? "",
            sku: product?.sku,
        },
        variant: variant ? {
            _id: variant?._id?.toString() ?? variant?.toString() ?? "",
            sku: variant?.sku,
            attributeCombination: variant?.attributeCombination,
        } : undefined,
        warehouse: {
            _id: warehouse?._id?.toString() ?? warehouse?.toString() ?? "",
            name: warehouse?.name ?? "",
            code: warehouse?.code ?? "",
        },
        quantityOnHand: inventory.quantityOnHand,
        quantityReserved: inventory.quantityReserved,
        quantityAvailable: Math.max(0, inventory.quantityOnHand - inventory.quantityReserved),
        reorderPoint: inventory.reorderPoint,
        reorderQuantity: inventory.reorderQuantity,
        lowStockAlertSent: inventory.lowStockAlertSent,
        company: inventory.company ? {_id: inventory.company._id.toString(), name: inventory.company.name} : undefined,
        ...mapOwnershipToDTO(inventory),
    };
}

export function inventoriesToDTO(inventories: IInventory[]): Inventory[] {
    return inventories.map(inventoryToDTO);
}
