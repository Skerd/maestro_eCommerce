import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function warehouseToSelect(warehouse: IWarehouse): ApiSelectDatum {
    const code = warehouse.code?.trim();
    return {
        value: warehouse._id.toString(),
        label: code ? `${warehouse.name} (${code})` : warehouse.name,
    };
}

export function warehousesToSelect(warehouses: IWarehouse[]): ApiSelectDatum[] {
    return warehouses.map(warehouseToSelect);
}
