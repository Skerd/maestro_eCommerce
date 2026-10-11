import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function productReviewToSelect(review: IProductReview): ApiSelectDatum {
    return {
        value: review._id.toString(),
        label: review.title || `${review.rating}★`
    };
}

export function productReviewsToSelect(reviews: IProductReview[]): ApiSelectDatum[] {
    return reviews.map(productReviewToSelect);
}
