import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";

export const PosConfigSimpleSnippet = {
    keys: {
        _id: {}, 
        name: {}, 
        isActive: {}, 
        warehouses: {}, 
        currency: CurrencySimpleSnippet
    },
};
