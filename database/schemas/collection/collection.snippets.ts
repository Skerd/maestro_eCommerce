import type {CollectionSimple} from "armonia/src/modules/eCommerce/dto/collection.dto";
import type {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const CollectionSimpleSnippet = defineSnippet<ICollection, CollectionSimple>()({
    keys: {
        _id: {},
        name: {},
        slug: {},
        type: {},
    },
});
