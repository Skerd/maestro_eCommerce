import {Router} from "express";
import {ObjectId} from "mongodb";
import {z} from "zod";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {isObjectIdZod} from "armonia/src/modules/core/helpers/zodBuilder";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {liveSellerCompanyClause} from "@eCommerceModule/utilities/shop/shopLiveSellers";
import {productReviewToShopDTO} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.dto";
import type {ShopProductReviewsResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";

export const basePath = "/api/eCommerce/shopProductReviews";
export const router = Router();

function shopProductReviewsFormSchema(languageCode: string, _form: any = null) {
    return z.object({
        id: isObjectIdZod("id", languageCode).optional(),
        slug: z.string().min(1).max(300).optional(),
        sellerCompanyId: isObjectIdZod("sellerCompanyId", languageCode).optional(),
        page: z.coerce.number().min(1).max(1000).optional(),
        limit: z.coerce.number().min(1).max(50).optional(),
    }).refine((value) => Boolean(value.id || value.slug), {
        message: "id_or_slug_required",
        path: ["slug"],
    });
}

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductReviewsFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductReviewsResponse> => {
        const {languageCode, origin, id, slug, sellerCompanyId, page = 1, limit = 10} = params;

        const ctx = await resolveShopContext(origin, languageCode);

        let product: any;
        if (id) {
            const byId: Record<string, unknown> = {_id: new ObjectId(id), status: "active"};
            if (ctx.mode === "tenant") byId.company = ctx.company._id;
            product = await Product.findOne(byId, {ratingAverage: 1, ratingCount: 1, company: 1}).noDeleted().lean();
        } else if (slug) {
            const slugKey = String(slug).toLowerCase();
            if (ctx.mode === "tenant") {
                product = await Product.findOne(
                    {company: ctx.company._id, slug: slugKey, status: "active"},
                    {ratingAverage: 1, ratingCount: 1, company: 1},
                ).noDeleted().lean();
            } else if (sellerCompanyId) {
                product = await Product.findOne(
                    {company: new ObjectId(sellerCompanyId), slug: slugKey, status: "active"},
                    {ratingAverage: 1, ratingCount: 1, company: 1},
                ).noDeleted().lean();
            } else {
                const matches = await Product.find(
                    {slug: slugKey, status: "active"},
                    {ratingAverage: 1, ratingCount: 1, company: 1},
                ).noDeleted().lean();
                if (matches.length > 1) {
                    throw apiValidationException("product_not_found", null, null, languageCode);
                }
                product = matches[0];
            }
        }
        if (!product) {
            throw apiValidationException("product_not_found", null, null, languageCode);
        }

        const productSellerId = product.company?._id ?? product.company;
        if (ctx.mode === "platform") {
            const {company: liveCompanies} = await liveSellerCompanyClause();
            const sellerId = String(productSellerId ?? "");
            if (!liveCompanies.$in.some((id) => String(id) === sellerId)) {
                throw apiValidationException("product_not_found", null, null, languageCode);
            }
        }
        const filter = {product: product._id, company: productSellerId};

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
