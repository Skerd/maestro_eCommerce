import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import State from "@coreModule/database/schemas/state/state";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {shopCitiesFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCities.form.validator";
import type {ShopCitiesFormType} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCities.form.validator";

/** A country's states for the storefront address forms (same `{countryId}` input as shopCities). */
export const basePath = "/api/eCommerce/shopStates";
export const router = Router();

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(shopCitiesFormSchema),
    asyncHandler(async (params: any & ShopCitiesFormType) => {
        const {languageCode, origin, countryId} = params;
        await resolveShopCompany(origin, languageCode);

        const states = await State.find({country: new ObjectId(countryId)})
            .select("name")
            .sort({name: 1})
            .lean();

        return {
            data: states.map((state) => ({
                _id: state._id.toString(),
                name: state.name ?? "",
            })),
        };
    }),
);
