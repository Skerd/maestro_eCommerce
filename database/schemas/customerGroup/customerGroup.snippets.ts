import type {CustomerGroupSimple} from "armonia/src/modules/eCommerce/dto/customerGroup.dto";
import type {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const CustomerGroupSimpleSnippet = defineSnippet<ICustomerGroup, CustomerGroupSimple>()({
    keys: {
        _id: {},
        name: {},
    },
});
