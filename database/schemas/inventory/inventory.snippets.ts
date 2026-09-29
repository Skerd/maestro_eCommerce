import type {InventorySimple} from "armonia/src/modules/eCommerce/dto/inventory.dto";
import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const InventorySimpleSnippet = defineSnippet<IInventory, InventorySimple>()({
    keys: {
        _id: {},
        quantityOnHand: {},
        quantityReserved: {},
    },
});
