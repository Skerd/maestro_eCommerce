/**
 * Review Service
 *
 * CRUD service for Review model.
 */

import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import Review, { IReview } from "@eCommerceModule/database/schemas/review/review";

export class ReviewService extends BaseCrudService<IReview, typeof Review> {
    constructor() {
        super(Review, "Review");
    }
}

export const reviewService = new ReviewService();
