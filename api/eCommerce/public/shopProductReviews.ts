import {Router} from "express";
import {z} from "zod";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {productReviewToShopDTO} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.dto";
import type {ShopProductReviewsResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";

export const basePath = "/api/eCommerce/shopProductReviews";
export const router = Router();

function shopProductReviewsFormSchema(_languageCode: string, _form: any = null) {
    return z.object({
        slug: z.string().min(1).max(300),
        page: z.coerce.number().min(1).max(1000).optional(),
        limit: z.coerce.number().min(1).max(50).optional(),
    });
}

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductReviewsFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductReviewsResponse> => {
        const {languageCode, origin, slug, page = 1, limit = 10} = params;

        const company = await resolveShopCompany(origin, languageCode);

        const product: any = await Product.findOne(
            {company: company._id, slug: String(slug).toLowerCase(), status: "active"},
            {ratingAverage: 1, ratingCount: 1},
        ).noDeleted().lean();
        if (!product) {
            throw apiValidationException("product_not_found", null, null, languageCode);
        }

        const filter = {product: product._id, company: company._id};

        const [reviews, total] = await Promise.all([
            ProductReview.find(filter).noDeleted()
                .select("rating title comment reviewer createdAt")
                .populate("reviewer", "name surname")
                .sort({createdAt: -1})
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ProductReview.countDocuments(filter).noDeleted(),
        ]);

        return {
            data: reviews.map(productReviewToShopDTO),
            total,
            ratingAverage: product.ratingAverage,
            ratingCount: product.ratingCount,
        };
    }),
);
