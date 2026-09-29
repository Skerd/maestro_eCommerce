import type {IInventoryMovement} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import type {InventoryMovement} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovement.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {InventorySimple} from "armonia/src/modules/eCommerce/dto/inventory.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import type {WarehouseSimple} from "armonia/src/modules/eCommerce/dto/warehouse.dto";
import {dateToISOString, mapMedia, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {InventorySimpleSnippet} from "@eCommerceModule/database/schemas/inventory/inventory.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {mapLifeCycleToDTO, mapOwnershipToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function inventoryMovementToDTO(movement: IInventoryMovement): InventoryMovement {
    return {
        _id: movement._id.toString(),
        inventory: mapSnippet<InventorySimple>()(movement.inventory, InventorySimpleSnippet),
        product: mapSnippet<ProductSimple>()(movement.product, ProductSimpleSnippet)!,
        variant: mapSnippet<ProductVariantSimple>()(movement.variant, ProductVariantSimpleSnippet),
        warehouse: mapSnippet<WarehouseSimple>()(movement.warehouse, WarehouseSimpleSnippet)!,
        quantity: movement.quantity,
        reason: movement.reason,
        note: movement.note,
        quantityBefore: movement.quantityBefore,
        quantityAfter: movement.quantityAfter,
        manufacturer: movement.manufacturer,
        receiptNumber: movement.receiptNumber,
        receipts: movement.receipts ? movement.receipts.map(mapMedia) : undefined,
        occurredAt: dateToISOString(movement.occurredAt) || undefined,
        unitCost: movement.unitCost,
        batchLot: movement.batchLot,
        expiryDate: dateToISOString(movement.expiryDate) || undefined,
        performedBy: mapSnippet<SimpleBlankUser>()(movement.performedBy, SimpleBlankUserSnippet),
        referenceType: movement.referenceType,
        referenceId: movement.referenceId?.toString(),
        ...mapOwnershipToDTO(movement),
        ...mapLifeCycleToDTO(movement),
    };
}

export function inventoryMovementsToDTO(movements: IInventoryMovement[]): InventoryMovement[] {
    return movements.map(inventoryMovementToDTO);
}
