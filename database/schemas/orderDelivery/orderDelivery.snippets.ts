import type {OrderDeliverySimple} from "armonia/src/modules/eCommerce/dto/orderDelivery.dto";
import type {IOrderDelivery} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const OrderDeliverySimpleSnippet = defineSnippet<IOrderDelivery, OrderDeliverySimple>()({
    keys: {
        _id: {},
        status: {},
    },
});
