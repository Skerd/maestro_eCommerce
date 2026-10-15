import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import City from "@coreModule/database/schemas/city/city";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import {shopCitiesFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCities.form.validator";
import type {ShopCitiesFormType} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCities.form.validator";

export const basePath = "/api/eCommerce/shopCities";
export const router = Router();

router.post(
    "",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(shopCitiesFormSchema),
    asyncHandler(async (params: any & ShopCitiesFormType) => {
        const {languageCode, origin, countryId} = params;
        await resolveShopCompany(origin, languageCode);

        const cities = await City.find({country: new ObjectId(countryId)})
            .select("name")
            .sort({name: 1})
            .lean();

        return {
            data: cities.map((city) => ({
                _id: city._id.toString(),
                name: city.name ?? "",
            })),
        };
    }),
);
