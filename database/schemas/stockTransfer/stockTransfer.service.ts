import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import StockTransfer, {IStockTransfer} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";

export class StockTransferService extends BaseCrudService<IStockTransfer, typeof StockTransfer> {
    constructor() {
        super(StockTransfer, "StockTransfer");
    }
}

export const stockTransferService = new StockTransferService();
