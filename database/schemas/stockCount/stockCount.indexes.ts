import {Schema} from "mongoose";

export function applyStockCountIndexes(StockCountSchema: Schema): void {
    StockCountSchema.index({company: 1, status: 1, createdAt: -1});
    StockCountSchema.index({warehouse: 1, company: 1});
}
