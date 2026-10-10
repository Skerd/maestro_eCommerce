import type {ProductReviewSimple} from "armonia/src/modules/eCommerce/dto/productReview.dto";
import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const ProductReviewSimpleSnippet = defineSnippet<IProductReview, ProductReviewSimple>()({
    keys: {
        _id: {},
        rating: {},
        title: {},
    },
});
