import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {defineSnippet} from "@coreModule/database/utilities/snippet";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";

export const ProductSimpleSnippet = defineSnippet<IProduct, ProductSimple>()({
    keys: {
        _id: {},
        title: {},
        slug: {},
        sku: {},
        status: {},
        type: {},
        currency: CurrencySimpleSnippet,
    },
});
