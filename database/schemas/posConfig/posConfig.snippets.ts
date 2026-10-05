import type {PosConfigSimple} from "armonia/src/modules/eCommerce/dto/posConfig.dto";
import type {PosConfigManagerUser} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.dto";
import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import type {IUser} from "@coreModule/database/schemas/user/user";
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

/** Manager user refs on POS config — includes `username` (unlike {@link SimpleUserSnippet}). */
export const PosConfigManagerUserSnippet = defineSnippet<IUser, PosConfigManagerUser>()({
    keys: {
        _id: {},
        name: {},
        surname: {},
        username: {},
    },
});
