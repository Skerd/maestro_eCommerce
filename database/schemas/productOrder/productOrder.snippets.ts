import type {ProductOrderSimple} from "armonia/src/modules/eCommerce/dto/productOrder.dto";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {defineSnippet} from "@coreModule/database/utilities/snippet";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";

export const ProductOrderSimpleSnippet = defineSnippet<IProductOrder, ProductOrderSimple>()({
    keys: {
        _id: {},
        orderNumber: {},
        status: {},
        paymentStatus: {},
        grandTotal: {},
        currency: CurrencySimpleSnippet,
    },
});
