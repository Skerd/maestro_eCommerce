import type {WarehouseSimple} from "armonia/src/modules/eCommerce/dto/warehouse.dto";
import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const WarehouseSimpleSnippet = defineSnippet<IWarehouse, WarehouseSimple>()({
    keys: {
        _id: {},
        name: {},
        code: {},
        isDefault: {},
    },
});
