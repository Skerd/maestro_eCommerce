import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import Country from "@coreModule/database/schemas/country/country";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";

export const basePath = "/api/eCommerce/shopCountries";
export const router = Router();

/**
 * Countries for the storefront checkout address form. The address `country`
 * is an ObjectId ref, and shipping/tax zone matching needs it — a buyer-safe
 * list (no admin model permissions) keeps the checkout usable.
 */
router.get(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {languageCode, origin} = params;

        await resolveShopContext(origin, languageCode);

        const countries = await Country.find({}).select("name code").sort({name: 1}).lean();

        return {
            data: countries.map((country: any) => ({
                _id: country._id.toString(),
                name: country.name ?? "",
                code: country.code ?? "",
            })),
        };
    }),
);
