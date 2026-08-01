import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";

export const ProductSimpleSnippet = {
    keys: {
        _id: {},
        title: {},
        slug: {},
        sku: {},
        status: {},
        type: {},
        currency: CurrencySimpleSnippet,
    },
};
