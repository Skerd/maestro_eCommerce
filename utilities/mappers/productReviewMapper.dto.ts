import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import type {ProductReview, ShopProductReview} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapRef(ref: any, fields: string[]): any {
    if (!ref) return undefined;
    if (typeof ref !== "object" || !("_id" in ref)) return {_id: ref.toString()};
    const out: Record<string, unknown> = {_id: ref._id.toString()};
    for (const field of fields) {
        if (ref[field] !== undefined) out[field] = ref[field];
    }
    return out;
}

function toIso(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    const d = new Date(value as any);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function productReviewToDTO(review: IProductReview): ProductReview {
    const product = mapRef(review.product, ["title", "slug", "sku"]);
    const title = review.title || undefined;
    const displayTitle =
        (typeof title === "string" && title.trim()) ||
        product?.title ||
        (review.rating != null ? `${review.rating}★` : undefined) ||
        review._id.toString();

    return {
        _id: review._id.toString(),
        order: mapRef(review.order, ["orderNumber", "status", "paymentStatus"]),
        product,
        rating: review.rating,
        title,
        comment: review.comment || undefined,
        displayTitle,
        reviewer: mapRef(review.reviewer, ["name", "surname", "photo"]),
        company: review.company
            ? {
                  _id: (review.company as any)._id?.toString?.() ?? review.company.toString(),
                  name: (review.company as any).name ?? "",
              }
            : undefined,
        createdAt: toIso((review as any).createdAt),
        updatedAt: toIso((review as any).updatedAt),
        ...mapSoftDeleteToDTO(review),
        ...mapOwnershipToDTO(review),
    };
}

export function productReviewsToDTO(reviews: IProductReview[]): ProductReview[] {
    return reviews.map(productReviewToDTO);
}

export function productReviewToSelect(review: IProductReview): ApiSelectDatum {
    return {value: review._id.toString(), label: review.title || `${review.rating}★`};
}

export function productReviewsToSelect(reviews: IProductReview[]): ApiSelectDatum[] {
    return reviews.map(productReviewToSelect);
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
