import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import type {UserContext} from "@coreModule/utilities/types/types";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {RestockInventoryFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/restockInventory.form.validator";
import type {DeductInventoryFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/deductInventory.form.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import InventoryModel from "./inventory";
import {restockInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/restockInventory.form.validator";
import {deductInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/deductInventory.form.validator";
import type {Inventory} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.dto";
import {inventoryToDTO} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.dto";
import {inventoryService} from "./inventory.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import type {InventoryMovementReason} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {INVENTORY_MOVEMENT_RECEIPT_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovement.schema-def";

const receiptUpload = mediaUploadMW({
    fields: {receipts: INVENTORY_MOVEMENT_RECEIPT_MAX},
    maxFileSize: 25 * 1024 * 1024,
});

const INBOUND_REASONS: InventoryMovementReason[] = ["restock", "initial", "return", "transfer_in"];

function parseOptionalDate(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function blankToUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

/**
 * Stock moves change `quantityOnHand`, so they require its field write tag
 * (`inventories[write:quantityOnHand]`) — the same gate CRUD edit applies.
 */
export function assertStockWrite(params: {languageCode: string; actionUserCtx: UserContext}): void {
    const {languageCode, actionUserCtx} = params;
    const writeFields = SchemaGuard.sanitizeFields(
        InventoryModel,
        getModelCollectedData("inventories").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
    if (!writeFields.quantityOnHand) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

/** Rejects a change that would leave less on hand than is reserved for open orders. */
export function assertWithinReserved(inventory: {quantityOnHand: number; quantityReserved: number}, delta: number, languageCode: string): void {
    if (delta >= 0) return;
    const after = inventory.quantityOnHand + delta;
    if (after < 0 || after < inventory.quantityReserved) {
        throw apiValidationException("insufficient_stock", "", null, languageCode);
    }
}

async function findLatestInboundSupply(
    params: TransactionRequiredParams & {inventoryId: ObjectId; batchLot?: string},
): Promise<{unitCost?: number; expiryDate?: Date} | undefined> {
    const {logger, languageCode, session, company, inventoryId, batchLot} = params;
    const query = {
        inventory: inventoryId,
        company: company._id,
        reason: {$in: INBOUND_REASONS},
    };
    const options = {logger, languageCode, session};
    const sort = {occurredAt: -1 as const, createdAt: -1 as const};
    const [matched] = await inventoryMovementService.find(
        batchLot ? {...query, batchLot} : query,
        options,
        undefined,
        undefined,
        sort,
        1,
    );
    const inbound = matched ?? (batchLot
        ? (await inventoryMovementService.find(query, options, undefined, undefined, sort, 1))[0]
        : undefined);
    if (!inbound) return undefined;
    return {
        unitCost: inbound.unitCost,
        expiryDate: inbound.expiryDate,
    };
}

async function applyQuantityChange(
    params: TransactionRequiredParams & {_id: string; quantity: number},
    reason: InventoryMovementReason,
    movement: {
        note?: string;
        manufacturer?: string;
        receiptNumber?: string;
        receipts?: ObjectId[];
        occurredAt?: Date;
        unitCost?: number;
        batchLot?: string;
        expiryDate?: Date;
    },
): Promise<Inventory> {
    assertStockWrite(params);

    const {logger, languageCode, session, company, actionUserCtx, _id, quantity} = params;

    const inventory = await inventoryService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {logger, languageCode, session, withDeleted: false},
    );

    const delta = reason === "restock" ? quantity : -quantity;
    const quantityBefore = inventory.quantityOnHand;

    assertWithinReserved(inventory, delta, languageCode);

    const productId = nestedEntityToRef(inventory.product);
    const warehouseId = nestedEntityToRef(inventory.warehouse);
    if (!productId || !warehouseId) {
        throw apiValidationException("inventory_not_found", "", null, languageCode);
    }
    const variantId = nestedEntityToRef(inventory.variant);

    // Update the row that was validated above, never another row with the same key
    await inventoryService.updateById(
        inventory._id,
        {$inc: {quantityOnHand: delta}},
        {logger, languageCode, session, auditUserId: actionUserCtx.userId},
    );

    await inventoryMovementService.create(
        {
            inventory: inventory._id,
            product: productId,
            variant: variantId,
            warehouse: warehouseId,
            quantity: delta,
            reason,
            quantityBefore,
            quantityAfter: quantityBefore + delta,
            performedBy: new ObjectId(actionUserCtx.userId),
            referenceType: "Inventory",
            referenceId: inventory._id,
            company: company._id,
            ...movement,
        },
        {logger, languageCode, session},
    );

    const updated = await inventoryService.findById(inventory._id, {logger, languageCode, session});
    if (!updated) {
        throw apiValidationException("inventory_not_found", "", null, languageCode);
    }
    return inventoryToDTO(updated);
}

export class InventoryActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: true,
        middleware: [receiptUpload],
        schema: restockInventoryFormSchema,
    })
    async restock(params: TransactionRequiredParams & RestockInventoryFormType): Promise<Inventory> {
        const {manufacturer, receiptNumber, receipts, occurredAt, unitCost, batchLot, expiryDate, note} = params;
        return applyQuantityChange(params, "restock", {
            note: blankToUndefined(note),
            manufacturer: blankToUndefined(manufacturer),
            receiptNumber: blankToUndefined(receiptNumber),
            receipts: receipts?.length ? receipts.map((id) => new ObjectId(id)) : undefined,
            occurredAt: parseOptionalDate(occurredAt) ?? new Date(),
            unitCost,
            batchLot: blankToUndefined(batchLot),
            expiryDate: parseOptionalDate(expiryDate),
        });
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: true,
        middleware: [receiptUpload],
        schema: deductInventoryFormSchema,
    })
    async deduct(params: TransactionRequiredParams & DeductInventoryFormType): Promise<Inventory> {
        const batchLot = blankToUndefined(params.batchLot);
        const inbound = await findLatestInboundSupply({
            ...params,
            inventoryId: new ObjectId(params._id),
            batchLot,
        });
        return applyQuantityChange(params, params.reason ?? "write_off", {
            note: blankToUndefined(params.note),
            receipts: params.receipts?.length ? params.receipts.map((id) => new ObjectId(id)) : undefined,
            occurredAt: new Date(),
            unitCost: inbound?.unitCost,
            batchLot,
            expiryDate: inbound?.expiryDate,
        });
    }
}
