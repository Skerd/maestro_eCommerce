import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

/**
 * "4★ · Ana Hoxha · Adventure Kids Hoodie": the rating, who wrote it and the product, each when the reader may see it
 * (the select populates the product and the reviewer). Without any of them, the review's title or comment.
 */
export function productReviewToSelect(review: IProductReview): ApiSelectDatum {
    const reviewer = [review.reviewer?.name, review.reviewer?.surname].filter(Boolean).join(" ").trim();
    const parts = [
        typeof review.rating === "number" ? `${review.rating}★` : "",
        reviewer,
        review.product?.title?.trim() ?? "",
    ].filter(Boolean);
    const fallback = review.title?.trim() || review.comment?.trim().slice(0, 60) || "";
    return {
        value: review._id.toString(),
        label: parts.length > 0 ? parts.join(" · ") : fallback,
    };
}

export function productReviewsToSelect(reviews: IProductReview[]): ApiSelectDatum[] {
    return reviews.map(productReviewToSelect);
}
