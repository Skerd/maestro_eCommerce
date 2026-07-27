import type {IInventoryMovement} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import type {InventoryMovement} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovement.dto";
import {mapMedia, mapPopulatedSimpleUser} from "@coreModule/utilities/mappers/common.mapper";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

function toIso(value: Date | string | undefined | null): string | undefined {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function mapReceiptMedia(media: any) {
    if (!media) return null;
    if (typeof media === "string" || media._id == null && typeof media.toString === "function") {
        const id = typeof media === "string" ? media : media.toString();
        if (!id || id === "[object Object]") return null;
        return {_id: id, name: "", size: 0, extension: undefined, mime: undefined, safeCheckedFlag: false};
    }
    if (!media._id) return null;
    return mapMedia(media);
}

export function inventoryMovementToDTO(movement: IInventoryMovement): InventoryMovement {
    const product = movement.product as any;
    const variant = movement.variant as any;
    const warehouse = movement.warehouse as any;
    const inventoryRef = movement.inventory as any;
    return {
        _id: movement._id.toString(),
        inventory: inventoryRef
            ? {_id: inventoryRef?._id?.toString() ?? inventoryRef?.toString() ?? ""}
            : undefined,
        product: {
            _id: product?._id?.toString() ?? product?.toString() ?? "",
            title: product?.title ?? "",
            sku: product?.sku,
        },
        variant: variant
            ? {
                  _id: variant?._id?.toString() ?? variant?.toString() ?? "",
                  sku: variant?.sku,
                  attributeCombination: variant?.attributeCombination,
              }
            : undefined,
        warehouse: {
            _id: warehouse?._id?.toString() ?? warehouse?.toString() ?? "",
            name: warehouse?.name ?? "",
            code: warehouse?.code ?? "",
        },
        quantity: movement.quantity,
        reason: movement.reason,
        note: movement.note,
        quantityBefore: movement.quantityBefore,
        quantityAfter: movement.quantityAfter,
        manufacturer: movement.manufacturer,
        receiptNumber: movement.receiptNumber,
        receipts: Array.isArray(movement.receipts)
            ? (movement.receipts.map(mapReceiptMedia).filter(Boolean) as ReturnType<typeof mapMedia>[])
            : undefined,
        occurredAt: toIso(movement.occurredAt),
        unitCost: movement.unitCost,
        batchLot: movement.batchLot,
        expiryDate: toIso(movement.expiryDate),
        performedBy: mapPopulatedSimpleUser(movement.performedBy as any),
        referenceType: movement.referenceType,
        referenceId: movement.referenceId?.toString?.() ?? (movement.referenceId as any)?.toString?.(),
        company: mapCompanyLabel(movement.company),
        createdAt: toIso(movement.createdAt),
    };
}

export function inventoryMovementsToDTO(movements: IInventoryMovement[]): InventoryMovement[] {
    return movements.map(inventoryMovementToDTO);
}
