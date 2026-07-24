import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductReview, {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";

export class ProductReviewService extends BaseCrudService<IProductReview, typeof ProductReview> {
    constructor() {
        super(ProductReview, "ProductReview");
    }
}

export const productReviewService = new ProductReviewService();
