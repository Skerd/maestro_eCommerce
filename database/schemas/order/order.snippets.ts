import type {OrderSimple, OrderWithTaskOrListing} from "armonia/src/modules/eCommerce/dto/order.dto";
import type {IOrder} from "@eCommerceModule/database/schemas/order/order";
import {defineSnippet} from "@coreModule/database/utilities/snippet";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {ListingSimpleSnippet} from "@eCommerceModule/database/schemas/listing/listing.snippets";
import {TaskRequestSimpleSnippet} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.snippets";

export const OrderSimpleSnippet = defineSnippet<IOrder, OrderSimple>()({
    keys: {
        _id: {},
        status: {},
        amount: {},
    },
});

export const OrderWithTaskOrListingSnippet = defineSnippet<IOrder, OrderWithTaskOrListing>()({
    keys: {
        _id: {},
        name: {},
        status: {},
        amount: {},
        currency: CurrencySimpleSnippet,
        taskRequest: TaskRequestSimpleSnippet,
        listing: ListingSimpleSnippet,
    },
});
