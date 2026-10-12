import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import StockCount, {IStockCount} from "@eCommerceModule/database/schemas/stockCount/stockCount";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import {
    assertStockDocumentLines,
    stockLineKey,
    type StockDocumentLine,
} from "@eCommerceModule/utilities/services/stockDocumentLines";

export class StockCountService extends BaseCrudService<IStockCount, typeof StockCount> {
    constructor() {
        super(StockCount, "StockCount");
    }

    /**
     * The count's lines with their expected (on-hand) quantity. Without entered
     * lines, every live stock row of the warehouse is snapshotted. Entered lines
     * keep the expected quantity they had; new ones take the row's on-hand now
     * (0 when the warehouse never stocked the item).
     */
    async countLines(
        warehouse: unknown,
        entered: (StockDocumentLine & {countedQuantity?: number})[] | undefined,
        previous: IStockCount["lines"],
        params: Pick<TransactionRequiredParams, "company" | "session" | "logger" | "languageCode">,
    ) {
        const {company, session, logger, languageCode} = params;
        const opts = {session, logger, languageCode, withDeleted: false};
        const warehouseId = nestedEntityToRef(warehouse);
        if (!(await warehouseService.exists({_id: warehouseId, company: company._id, deletedAt: null}, opts))) {
            throw apiValidationException("inventory_reference_invalid", "warehouse", null, languageCode);
        }

        const rows = await inventoryService.find({warehouse: warehouseId, company: company._id}, opts);
        if (!entered?.length) {
            return rows.map(row => ({product: row.product, variant: row.variant, expectedQuantity: row.quantityOnHand}));
        }

        await assertStockDocumentLines(entered, [warehouseId], params);
        const onHand = new Map(rows.map(row => [stockLineKey(row), row.quantityOnHand]));
        const expectedBefore = new Map(previous.map(line => [stockLineKey(line), line.expectedQuantity]));
        return entered.map(line => ({
            product: line.product,
            variant: line.variant,
            countedQuantity: line.countedQuantity,
            expectedQuantity: expectedBefore.get(stockLineKey(line)) ?? onHand.get(stockLineKey(line)) ?? 0,
        }));
    }
}

export const stockCountService = new StockCountService();
