import type {OrderMilestoneSimple} from "armonia/src/modules/eCommerce/dto/orderMilestone.dto";
import type {IOrderMilestone} from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const OrderMilestoneSimpleSnippet = defineSnippet<IOrderMilestone, OrderMilestoneSimple>()({
    keys: {
        _id: {},
        name: {},
        status: {},
        amount: {},
    },
});
