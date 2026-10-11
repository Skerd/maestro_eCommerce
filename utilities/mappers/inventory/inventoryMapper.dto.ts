import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import type {Inventory} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import type {WarehouseSimple} from "armonia/src/modules/eCommerce/dto/warehouse.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function inventoryToDTO(inventory: IInventory): Inventory {
    return {
        _id: inventory._id.toString(),
        product: mapSnippet<ProductSimple>()(inventory.product, ProductSimpleSnippet)!,
        variant: mapSnippet<ProductVariantSimple>()(inventory.variant, ProductVariantSimpleSnippet),
        warehouse: mapSnippet<WarehouseSimple>()(inventory.warehouse, WarehouseSimpleSnippet)!,
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
