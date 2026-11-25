import type {ClientSession, FilterQuery} from "mongoose";
import type {ObjectId} from "mongodb";
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

    /** A live review as the platform's report desk reads it (D191): by its id alone, whichever shop owns it. */
    findReportable(id: ObjectId, session?: ClientSession) {
        return this.model.findOne({_id: id, deletedAt: null})
            .select("company product reviewer rating title comment hiddenByPlatform")
            .session(session ?? null)
            .lean<{_id: ObjectId; company: ObjectId; product: ObjectId; reviewer: ObjectId; rating: number; title?: string; comment?: string; hiddenByPlatform?: boolean}>();
    }
}

export const productReviewService = new ProductReviewService();
