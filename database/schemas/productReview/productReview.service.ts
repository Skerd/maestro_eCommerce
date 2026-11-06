import type {FilterQuery} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductReview, {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";

export class ProductReviewService extends BaseCrudService<IProductReview, typeof ProductReview> {
    constructor() {
        super(ProductReview, "ProductReview");
    }

    /** One storefront page of live reviews, newest first, with the reviewer's name only. */
    findShopPage(filter: FilterQuery<IProductReview>, page: number, limit: number) {
        return ProductReview.find(filter).noDeleted()
            .select("rating title comment reviewer createdAt")
            .populate("reviewer", "name surname")
            .sort({createdAt: -1})
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    countLive(filter: FilterQuery<IProductReview>) {
        return ProductReview.countDocuments(filter).noDeleted();
    }
}

export const productReviewService = new ProductReviewService();
