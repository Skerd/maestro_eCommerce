import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import type {ProductReview, ShopProductReview} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";
import type {SimpleUser} from "armonia/src/modules/core/dto/user.dto";
import type {ProductOrderSimple} from "armonia/src/modules/eCommerce/dto/productOrder.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";

export function productReviewToDTO(review: IProductReview): ProductReview {
    return {
        _id: review._id.toString(),
        order: mapSnippet<ProductOrderSimple>()(review.order, ProductOrderSimpleSnippet),
        product: mapSnippet<ProductSimple>()(review.product, ProductSimpleSnippet),
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        reviewer: mapSnippet<SimpleUser>()(review.reviewer, SimpleUserSnippet),
        ...mapSoftDeleteToDTO(review),
        ...mapOwnershipToDTO(review),
        ...mapLifeCycleToDTO(review),
    };
}

export function productReviewsToDTO(reviews: IProductReview[]): ProductReview[] {
    return reviews.map(productReviewToDTO);
}

/** Public storefront shape: only rating/title/comment + reviewer display name. */
export function productReviewToShopDTO(review: any): ShopProductReview {
    const reviewer = review.reviewer;
    const reviewerName = reviewer && typeof reviewer === "object"
        ? [reviewer.name, reviewer.surname?.[0] ? `${reviewer.surname[0]}.` : undefined].filter(Boolean).join(" ")
        : undefined;
    return {
        _id: review._id.toString(),
        rating: review.rating,
        title: review.title || undefined,
        comment: review.comment || undefined,
        reviewerName: reviewerName || undefined,
        createdAt: review.createdAt ? new Date(review.createdAt).toISOString() : undefined,
    };
}
