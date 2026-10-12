import {Schema} from "mongoose";

export function applyStockTransferIndexes(StockTransferSchema: Schema): void {
    StockTransferSchema.index({company: 1, status: 1, createdAt: -1});
    StockTransferSchema.index({fromWarehouse: 1, company: 1});
    StockTransferSchema.index({toWarehouse: 1, company: 1});
}
