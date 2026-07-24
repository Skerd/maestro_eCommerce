import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";

export const basePath = "/api/eCommerce/digitalDelivery";
export const router = Router();

/**
 * The signed-in buyer's download entitlements (storefront account pages).
 * Tokens are only ever exposed to their owner.
 */
router.post(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx, orderId} = params;

        const filter: Record<string, unknown> = {
            company: company._id,
            customer: new ObjectId(actionUserCtx.userId),
        };
        if (orderId) filter.order = new ObjectId(orderId);

        const deliveries = await DigitalDelivery.find(filter)
            .populate("product", "title slug")
            .populate("media", "fileName")
            .sort({createdAt: -1})
            .limit(100)
            .lean();

        return {
            data: deliveries.map((delivery: any) => ({
                _id: delivery._id.toString(),
                order: (delivery.order?._id ?? delivery.order)?.toString(),
                product: delivery.product && typeof delivery.product === "object"
                    ? {_id: delivery.product._id.toString(), title: delivery.product.title, slug: delivery.product.slug}
                    : undefined,
                token: delivery.token,
                files: (delivery.media ?? []).map((media: any) => ({
                    _id: (media?._id ?? media).toString(),
                    fileName: media?.fileName,
                })),
                downloadLimit: delivery.downloadLimit,
                downloadCount: delivery.downloadCount,
                remainingDownloads: Math.max(0, delivery.downloadLimit - delivery.downloadCount),
                expiresAt: delivery.expiresAt ? new Date(delivery.expiresAt).toISOString() : undefined,
            })),
        };
    }),
);
