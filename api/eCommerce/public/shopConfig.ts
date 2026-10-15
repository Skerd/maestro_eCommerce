import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {PAYMENTS} from "@financeModule/environment";
import Currency from "@coreModule/database/schemas/currency/currency";
import {resolveShopCompany} from "@eCommerceModule/utilities/shop/shopCompany.util";
import type {
    ShopCompany,
    ShopCompanyAddress,
    ShopConfigResponse,
} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopCatalog.types";

export const basePath = "/api/eCommerce/shopConfig";
export const router = Router();

function optionalTrimmed(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function optionalId(value: unknown): string | undefined {
    if (value == null) {
        return undefined;
    }
    if (typeof value === "object" && "_id" in value) {
        return optionalId((value as {_id?: unknown})._id);
    }
    const id = String(value).trim();
    return id.length > 0 ? id : undefined;
}

function namedRef(value: unknown): string | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    return optionalTrimmed((value as {name?: unknown}).name);
}

function mapCompanyAddresses(
    addresses: Array<{
        street?: string;
        city?: unknown;
        country?: unknown;
    }> | undefined,
): ShopCompanyAddress[] | undefined {
    if (!Array.isArray(addresses) || addresses.length === 0) {
        return undefined;
    }

    const mapped = addresses.flatMap((address) => {
        const city = namedRef(address.city);
        const country = namedRef(address.country);
        const street = optionalTrimmed(address.street);
        const label =
            city && country
                ? `${city}, ${country}`
                : city || country || street;
        if (!label) {
            return [];
        }
        return [{label}];
    });

    return mapped.length > 0 ? mapped : undefined;
}

function mapShopCompany(company: {
    name?: string;
    logo?: unknown;
    email?: string;
    phoneNumber?: string;
    vat?: string;
    website?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    addresses?: Array<{street?: string; city?: unknown; country?: unknown}>;
}): ShopCompany {
    const mapped: ShopCompany = {};
    const name = optionalTrimmed(company.name);
    const logo = optionalId(company.logo);
    const email = optionalTrimmed(company.email);
    const phoneNumber = optionalTrimmed(company.phoneNumber);
    const vat = optionalTrimmed(company.vat);
    const website = optionalTrimmed(company.website);
    const linkedin = optionalTrimmed(company.linkedin);
    const instagram = optionalTrimmed(company.instagram);
    const facebook = optionalTrimmed(company.facebook);
    const addresses = mapCompanyAddresses(company.addresses);

    if (name) mapped.name = name;
    if (logo) mapped.logo = logo;
    if (email) mapped.email = email;
    if (phoneNumber) mapped.phoneNumber = phoneNumber;
    if (vat) mapped.vat = vat;
    if (website) mapped.website = website;
    if (linkedin) mapped.linkedin = linkedin;
    if (instagram) mapped.instagram = instagram;
    if (facebook) mapped.facebook = facebook;
    if (addresses) mapped.addresses = addresses;
    return mapped;
}

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
        await company.populate([
            {path: "addresses.city", select: "name"},
            {path: "addresses.country", select: "name"},
        ]);

        const currency: any = await Currency.findOne({}).select("symbol abbreviation decimalPlaces").sort({createdAt: 1}).lean();
        const shopCompany = mapShopCompany(company);

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
                companyName: shopCompany.name,
                company: Object.keys(shopCompany).length > 0 ? shopCompany : undefined,
            },
        };
    }),
);
