import type {FiscalConfigSimple} from "armonia/src/modules/eCommerce/dto/fiscalConfig.dto";
import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const FiscalConfigSimpleSnippet = defineSnippet<IFiscalConfig, FiscalConfigSimple>()({
    keys: {
        _id: {},
        name: {},
    },
});
