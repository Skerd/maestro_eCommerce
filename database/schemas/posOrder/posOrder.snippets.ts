import type {PosOrderSimple} from "armonia/src/modules/eCommerce/dto/posOrder.dto";
import type {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const PosOrderSimpleSnippet = defineSnippet<IPosOrder, PosOrderSimple>()({
    keys: {
        _id: {},
        name: {},
        state: {},
        amountTotal: {},
        session: {},
    },
});
