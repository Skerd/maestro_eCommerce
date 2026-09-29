import type {PosConfigSimple} from "armonia/src/modules/eCommerce/dto/posConfig.dto";
import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {defineSnippet} from "@coreModule/database/utilities/snippet";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";

export const PosConfigSimpleSnippet = defineSnippet<IPosConfig, PosConfigSimple>()({
    keys: {
        _id: {},
        name: {},
        isActive: {},
        warehouses: {},
        currency: CurrencySimpleSnippet,
    },
});
