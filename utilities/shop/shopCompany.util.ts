import type {ICompany} from "@coreModule/database/schemas/company/company";
import {resolveCompanyByOrigin, resolveSignupCompany} from "@coreModule/utilities/marketing/resolveCompanyByOrigin";
import {isPortalApexOrigin} from "@coreModule/utilities/marketing/portalOrigin";

/**
 * Resolves the storefront tenant company from the request origin (public shop
 * domain). Same rule as every other public surface — exact allowedDomains
 * match first, wildcard company as local-dev fallback — so it delegates to core.
 */
export const resolveShopCompany = resolveCompanyByOrigin;

export type ShopTenantContext = {
    mode: "tenant";
    company: ICompany;
};

export type ShopPlatformContext = {
    mode: "platform";
    /** Session / signup company for authenticated cart & checkout on apex. */
    sessionCompany: ICompany;
};

export type ShopContext = ShopTenantContext | ShopPlatformContext;

/**
 * Public shop tenancy: the portal apex is platform (all listed sellers); a company's
 * site in the portal zone, or any other host, resolves to one company.
 */
export async function resolveShopContext(origin: string, languageCode: string): Promise<ShopContext> {
    if (isPortalApexOrigin(origin)) {
        const sessionCompany = await resolveSignupCompany(origin, languageCode);
        return {mode: "platform", sessionCompany};
    }
    const company = await resolveCompanyByOrigin(origin, languageCode);
    return {mode: "tenant", company};
}
