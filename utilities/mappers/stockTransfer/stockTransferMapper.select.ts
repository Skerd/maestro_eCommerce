import type {IStockTransfer} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function stockTransferToSelect(transfer: IStockTransfer): ApiSelectDatum {
    return {
        value: transfer._id.toString(),
        label: transfer._id.toString(),
    };
}

export function stockTransfersToSelect(transfers: IStockTransfer[]): ApiSelectDatum[] {
    return transfers.map(stockTransferToSelect);
}
