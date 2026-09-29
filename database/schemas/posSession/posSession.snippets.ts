import type {PosSessionSimple} from "armonia/src/modules/eCommerce/dto/posSession.dto";
import type {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const PosSessionSimpleSnippet = defineSnippet<IPosSession, PosSessionSimple>()({
    keys: {
        _id: {},
        name: {},
        state: {},
        config: {},
        openingBalance: {},
        totalSales: {},
    },
});
