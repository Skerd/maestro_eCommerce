import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {stateService} from "@coreModule/database/schemas/state/state.service";
import {resolveShopContext} from "@eCommerceModule/utilities/shop/shopCompany.util";
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
        await resolveShopContext(origin, languageCode);

        const states = await stateService.find({country: new ObjectId(countryId)}, {}, undefined, "name", {name: 1});

        return {
            data: states.map((state) => ({
                _id: state._id.toString(),
                name: state.name ?? "",
            })),
        };
    }),
);
