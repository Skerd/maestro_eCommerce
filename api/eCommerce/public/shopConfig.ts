import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {PAYMENTS} from "@financeModule/environment";
import Currency from "@coreModule/database/schemas/currency/currency";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import type {ShopConfigResponse} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopConfig";
export const router = Router();

/**
 * Public storefront bootstrap config. Only ever exposes the Stripe
 * PUBLISHABLE key — the secret key and webhook secret stay in maestro.
 */
router.get(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any): Promise<ShopConfigResponse> => {
        const {languageCode, origin} = params;

        const company = await resolveShopCompany(origin, languageCode);

        const currency: any = await Currency.findOne({}).select("symbol abbreviation decimalPlaces").sort({createdAt: 1}).lean();

        return {
            data: {
                stripePublishableKey: PAYMENTS.STRIPE_ENABLED ? PAYMENTS.STRIPE_PUBLISHABLE_KEY || undefined : undefined,
                currency: currency
                    ? {
                          _id: currency._id.toString(),
                          symbol: currency.symbol,
                          abbreviation: currency.abbreviation,
                          decimalPlaces: currency.decimalPlaces,
                      }
                    : undefined,
                companyName: (company as any).name,
            },
        };
    }),
);
