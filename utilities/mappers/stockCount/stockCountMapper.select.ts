import type {IStockCount} from "@eCommerceModule/database/schemas/stockCount/stockCount";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function stockCountToSelect(count: IStockCount): ApiSelectDatum {
    return {
        value: count._id.toString(),
        label: count._id.toString(),
    };
}

export function stockCountsToSelect(counts: IStockCount[]): ApiSelectDatum[] {
    return counts.map(stockCountToSelect);
}
