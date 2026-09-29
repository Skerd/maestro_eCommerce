import type {PosPaymentMethodSimple} from "armonia/src/modules/eCommerce/dto/posPaymentMethod.dto";
import type {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const PosPaymentMethodSimpleSnippet = defineSnippet<IPosPaymentMethod, PosPaymentMethodSimple>()({
    keys: {
        _id: {},
        name: {},
        type: {},
        isActive: {},
        sequence: {},
        cashQuickAmounts: {},
        terminalEnabled: {},
        terminalProvider: {},
        terminalProtocol: {},
        terminalHost: {},
        terminalPort: {},
        terminalId: {},
        terminalPath: {},
    },
});
