import type {InventorySimple} from "armonia/src/modules/eCommerce/dto/inventory.dto";
import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import {defineSnippet} from "@coreModule/database/utilities/snippet";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";

export const InventorySimpleSnippet = defineSnippet<IInventory, InventorySimple>()({
    keys: {
        _id: {},
        quantityOnHand: {},
        quantityReserved: {},
        warehouse: WarehouseSimpleSnippet,
    },
});
