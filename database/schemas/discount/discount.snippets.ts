import type {DiscountSimple} from "armonia/src/modules/eCommerce/dto/discount.dto";
import type {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const DiscountSimpleSnippet = defineSnippet<IDiscount, DiscountSimple>()({
    keys: {
        _id: {},
        title: {},
        code: {},
        type: {},
        value: {},
    },
});
