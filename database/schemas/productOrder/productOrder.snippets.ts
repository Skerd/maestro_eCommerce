import type {ProductOrderSimple} from "armonia/src/modules/eCommerce/dto/productOrder.dto";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const ProductOrderSimpleSnippet = defineSnippet<IProductOrder, ProductOrderSimple>()({
    keys: {
        _id: {},
        orderNumber: {},
        status: {},
        paymentStatus: {},
        grandTotal: {},
    },
});
