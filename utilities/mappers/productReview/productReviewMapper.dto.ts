import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import type {ProductReview, ShopProductReview} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapPopulatedUserWithPhoto} from "@coreModule/utilities/mappers/common.mapper";

export function productReviewToDTO(review: IProductReview): ProductReview {
    return {
        _id: review._id.toString(),
        order: review.order ? {
            _id: review.order._id,
            orderNumber: review.order.orderNumber,
            status: review.order.status,
            paymentStatus: review.order.paymentStatus,
        } : undefined,
        product: review.product ? {
            _id: review.product._id,
            title: review.product.title,
            slug: review.product.slug,
            sku: review.product.sku,
        } : undefined,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        reviewer: mapPopulatedUserWithPhoto(review.reviewer),
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
