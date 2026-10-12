import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import {assertOwnStockReferences} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import type {InventoryMovementReason} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {trackedStockLines} from "@eCommerceModule/utilities/services/inventoryReservationService";

/** A line of a stock transfer or stock count: one stock item, without its warehouse. */
export type StockDocumentLine = {product: unknown; variant?: unknown};

type LinesParams = Pick<TransactionRequiredParams, "company" | "session" | "logger" | "languageCode">;

export function stockLineKey(line: StockDocumentLine): string {
    return `${String(nestedEntityToRef(line.product))}|${String(nestedEntityToRef(line.variant) ?? "")}`;
}

/** The id behind a populated or plain reference; a missing one is an invalid stock reference. */
export function requireRef(value: unknown, languageCode: string): ObjectId {
    const id = nestedEntityToRef(value);
    if (!id) throw apiValidationException("inventory_reference_invalid", "lines", null, languageCode);
    return id;
}

/**
 * Lines of a stock document must each name a different, stock-tracked item of
 * this company (a bundle moves as its components, so it can't be a line), in
 * warehouses of this company.
 */
export async function assertStockDocumentLines(
    lines: StockDocumentLine[],
    warehouses: unknown[],
    params: LinesParams,
): Promise<void> {
    const {company, languageCode} = params;
    const keys = lines.map(stockLineKey);
    if (new Set(keys).size !== keys.length) {
        throw apiValidationException("stock_line_duplicate", "lines", null, languageCode);
    }
    for (const line of lines) {
        for (const warehouse of warehouses) {
            await assertOwnStockReferences({product: line.product, variant: line.variant, warehouse}, params);
        }
    }

    const tracked = await trackedStockLines(
        lines.map(line => ({product: requireRef(line.product, languageCode), variant: nestedEntityToRef(line.variant), quantity: 1})),
        company._id,
        params,
    );
    const trackedKeys = new Set(tracked.map(stockLineKey));
    if (keys.some(key => !trackedKeys.has(key))) {
        throw apiValidationException("stock_line_not_tracked", "lines", null, languageCode);
    }
}

/** Ledger entry for a stock row that just changed by `delta` because of a stock document. */
export async function recordStockMovement(
    row: IInventory,
    delta: number,
    reason: InventoryMovementReason,
    reference: {type: "StockTransfer" | "StockCount"; id: ObjectId; performedBy: string},
    ctx: CrudOptions,
): Promise<void> {
    await inventoryMovementService.create(
        {
            inventory: row._id,
            product: nestedEntityToRef(row.product),
            variant: nestedEntityToRef(row.variant),
            warehouse: nestedEntityToRef(row.warehouse),
            quantity: delta,
            reason,
            quantityBefore: row.quantityOnHand - delta,
            quantityAfter: row.quantityOnHand,
            performedBy: new ObjectId(reference.performedBy),
            referenceType: reference.type,
            referenceId: reference.id,
            company: nestedEntityToRef(row.company),
        },
        ctx,
    );
}
