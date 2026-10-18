import type {PromotionSimple} from "armonia/src/modules/eCommerce/dto/promotion.dto";
import type {IPromotion} from "@eCommerceModule/database/schemas/promotion/promotion";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const PromotionSimpleSnippet = defineSnippet<IPromotion, PromotionSimple>()({
    keys: {
        _id: {},
        name: {},
        type: {},
        startAt: {},
        endAt: {},
    },
});
