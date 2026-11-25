import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {shopProductReviewsFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopProductReviews/shopProductReviews.form.validator";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {resolveStorefrontContext, inStorefrontCatalog} from "@coreModule/utilities/marketing/portalStorefront";
import {liveSellerCompanyClause} from "@eCommerceModule/utilities/shop/shopLiveSellers";
import {productReviewToShopDTO} from "@eCommerceModule/utilities/mappers/productReview/productReviewMapper.dto";
import type {ShopProductReviewsResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.dto";
import {notHiddenByPlatform} from "@coreModule/database/plugins/platformHiddenPlugin";

export const basePath = "/api/eCommerce/shopProductReviews";

/** A product the shop shows (active, not hidden by the platform), and a review it shows (not hidden by the platform, D191). */
const SHOWN = {status: "active", ...notHiddenByPlatform()};
export const router = Router();

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    validateFormZod(shopProductReviewsFormSchema),
    asyncHandler(async (params: any): Promise<ShopProductReviewsResponse> => {
        const {languageCode, origin, id, slug, sellerCompanyId, page = 1, limit = 10} = params;

        const ctx = await resolveStorefrontContext(origin, languageCode);
        return inStorefrontCatalog(ctx, async () => {
            let product: any;
            if (id) {
                const byId: Record<string, unknown> = {_id: new ObjectId(id), ...SHOWN};
                if (ctx.mode === "tenant") byId.company = ctx.company._id;
                product = await productService.findShopRating(byId);
            } else if (slug) {
                const slugKey = String(slug).toLowerCase();
                if (ctx.mode === "tenant") {
                    product = await productService.findShopRating({company: ctx.company._id, slug: slugKey, ...SHOWN});
                } else if (sellerCompanyId) {
                    product = await productService.findShopRating({company: new ObjectId(sellerCompanyId), slug: slugKey, ...SHOWN});
                } else {
                    const matches = await productService.findShopRatings({slug: slugKey, ...SHOWN});
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
            const filter = {product: product._id, company: productSellerId, ...notHiddenByPlatform()};

            const [reviews, total] = await Promise.all([
                productReviewService.findShopPage(filter, page, limit),
                productReviewService.countLive(filter),
            ]);

            return {
                data: reviews.map(productReviewToShopDTO),
                total,
                ratingAverage: product.ratingAverage,
                ratingCount: product.ratingCount,
            };

        });
    }),
);
