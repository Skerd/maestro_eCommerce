import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import Warehouse, {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";

export class WarehouseService extends BaseCrudService<IWarehouse, typeof Warehouse> {
    constructor() {
        super(Warehouse, "Warehouse");
    }
}

export const warehouseService = new WarehouseService();
