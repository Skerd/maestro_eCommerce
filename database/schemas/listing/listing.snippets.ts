import type {ListingSimple} from "armonia/src/modules/eCommerce/dto/listing.dto";
import type {IListing} from "@eCommerceModule/database/schemas/listing/listing";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const ListingSimpleSnippet = defineSnippet<IListing, ListingSimple>()({
    keys: {
        _id: {},
        name: {},
        title: {},
        status: {},
    },
});
