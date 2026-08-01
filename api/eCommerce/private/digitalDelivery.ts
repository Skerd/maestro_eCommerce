import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {digitalDeliveryService} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery.service";
import {digitalDeliveriesToDTO} from "@eCommerceModule/utilities/mappers/digitalDelivery/digitalDeliveryMapper.dto";

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
        const {logger, languageCode, company, actionUserCtx, orderId} = params;

        const filter: Record<string, unknown> = {
            company: company._id,
            customer: new ObjectId(actionUserCtx.userId),
        };
        if (orderId) filter.order = new ObjectId(orderId);

        const deliveries = await digitalDeliveryService.find(
            filter,
            {logger, languageCode},
            [
                {path: "product", select: "title slug"},
                {path: "media", select: "fileName"},
            ],
            undefined,
            {createdAt: -1},
            100,
            0,
        );

        return {data: digitalDeliveriesToDTO(deliveries)};
    }),
);
