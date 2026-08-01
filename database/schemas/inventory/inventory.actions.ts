import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {restockInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/restockInventory.form.validator";
import {deductInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/deductInventory.form.validator";
import type {Inventory} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.dto";
import {inventoryToDTO} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.dto";
import {inventoryService} from "./inventory.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import type {InventoryMovementReason} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";

function parseOptionalDate(value: unknown): Date | undefined {
    if (value == null || value === "") return undefined;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function asObjectIdArray(value: unknown): ObjectId[] | undefined {
    if (!Array.isArray(value) || !value.length) return undefined;
    return value.filter(Boolean).map((id) => new ObjectId(String(id)));
}

function trimOptional(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const t = value.trim();
    return t.length ? t : undefined;
}

async function applyStockMove(params: Record<string, any>, direction: "restock" | "deduct"): Promise<Inventory> {
    const {
        logger,
        languageCode,
        session,
        company,
        actionUserCtx,
        _id,
        quantity,
        manufacturer,
        receiptNumber,
        receipts,
        occurredAt,
        unitCost,
        batchLot,
        expiryDate,
        note,
    } = params;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
        throw apiValidationException("invalid_quantity", null, null, languageCode);
    }

    const inventory = await inventoryService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {logger, languageCode, session},
    );

    const delta = direction === "restock" ? qty : -qty;
    const reason: InventoryMovementReason = direction === "restock" ? "restock" : "write_off";
    const quantityBefore = inventory.quantityOnHand;

    if (direction === "deduct" && quantityBefore + delta < 0) {
        throw apiValidationException("insufficient_stock", null, null, languageCode);
    }

    const productId = (inventory.product as any)?._id ?? (inventory.product as any);
    const variantId = (inventory.variant as any)?._id ?? (inventory.variant as any);
    const warehouseId = (inventory.warehouse as any)?._id ?? (inventory.warehouse as any);

    await inventoryService.adjust(productId, variantId, warehouseId, delta, {logger, languageCode, session});

    await inventoryMovementService.create(
        {
            inventory: inventory._id,
            product: productId,
            variant: variantId,
            warehouse: warehouseId,
            quantity: delta,
            reason,
            note: trimOptional(note),
            quantityBefore,
            quantityAfter: quantityBefore + delta,
            manufacturer: trimOptional(manufacturer),
            receiptNumber: trimOptional(receiptNumber),
            receipts: asObjectIdArray(receipts),
            occurredAt: parseOptionalDate(occurredAt) ?? new Date(),
            unitCost: unitCost != null && unitCost !== "" ? Number(unitCost) : undefined,
            batchLot: trimOptional(batchLot),
            expiryDate: parseOptionalDate(expiryDate),
            performedBy: actionUserCtx.userId,
            referenceType: "Inventory",
            referenceId: inventory._id,
            company: company._id,
        } as any,
        {logger, languageCode, session},
    );

    const updated = await inventoryService.findById(inventory._id, {logger, languageCode, session});
    if (!updated) {
        throw apiValidationException("inventory_not_found", null, null, languageCode);
    }
    return inventoryToDTO(updated);
}

export class InventoryActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: true,
        schema: restockInventoryFormSchema,
    })
    async restock(params: Record<string, any>): Promise<Inventory> {
        return applyStockMove(params, "restock");
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: true,
        schema: deductInventoryFormSchema,
    })
    async deduct(params: Record<string, any>): Promise<Inventory> {
        return applyStockMove(params, "deduct");
    }
}
