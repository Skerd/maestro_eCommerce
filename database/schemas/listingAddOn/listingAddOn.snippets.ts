import type {ListingAddOnSimple} from "armonia/src/modules/eCommerce/dto/listingAddOn.dto";
import type {IListingAddOn} from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn";
import {defineSnippet} from "@coreModule/database/utilities/snippet";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";

export const ListingAddOnSimpleSnippet = defineSnippet<IListingAddOn, ListingAddOnSimple>()({
    keys: {
        _id: {},
        name: {},
        deliveryDays: {},
        price: {
            keys: {
                amount: {},
                currency: CurrencySimpleSnippet,
            },
        },
    },
});
