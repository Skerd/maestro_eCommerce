import type {IInventoryMovement} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import type {InventoryMovement} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovement.dto";
import {
    dateToISOString,
    mapMedia,
    mapPopulatedSimpleUser,
} from "@coreModule/utilities/mappers/common.mapper";
import {mapLifeCycleToDTO, mapOwnershipToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function inventoryMovementToDTO(movement: IInventoryMovement): InventoryMovement {
    return {
        _id: movement._id.toString(),
        inventory: movement.inventory ? {_id: movement.inventory._id} : undefined,
        product: movement.product ? {
            _id: movement.product._id,
            title: movement.product.title ?? "",
            sku: movement.product.sku,
        } : undefined,
        variant: movement.variant ? {
            _id: movement.variant._id,
            sku: movement.variant.sku,
            attributeCombination: movement.variant.attributeCombination,
        } : undefined,
        warehouse: movement.warehouse ? {
            _id: movement.warehouse._id,
            name: movement.warehouse.name,
            code: movement.warehouse.code,
        } : undefined,
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
        performedBy: mapPopulatedSimpleUser(movement.performedBy),
        referenceType: movement.referenceType,
        referenceId: movement.referenceId?.toString(),
        ...mapOwnershipToDTO(movement),
        ...mapLifeCycleToDTO(movement)
    };
}

export function inventoryMovementsToDTO(movements: IInventoryMovement[]): InventoryMovement[] {
    return movements.map(inventoryMovementToDTO);
}
