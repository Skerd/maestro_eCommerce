import type {ICompany} from "@coreModule/database/schemas/company/company";
import {resolveCompanyByOrigin, resolveSignupCompany} from "@coreModule/utilities/marketing/resolveCompanyByOrigin";
import {isPortalApexOrigin} from "@coreModule/utilities/marketing/portalOrigin";
import {asCrossTenant, setRequestTenant} from "@coreModule/utilities/endpoints/tenantScope";

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
        // The apex works on the platform's own data (config, reference lists, accounts); catalog
        // views that span sellers say so through `inShopCatalog` (D16).
        setRequestTenant(sessionCompany._id, languageCode);
        return {mode: "platform", sessionCompany};
    }
    const company = await resolveCompanyByOrigin(origin, languageCode);
    return {mode: "tenant", company};
}

/**
 * Runs a read-only catalog view (D16): across every listed seller on the portal apex, and inside the
 * one company on its own site, whose tenant `resolveCompanyByOrigin` already set.
 */
export function inShopCatalog<T>(ctx: ShopContext, view: () => Promise<T>): Promise<T> {
    return ctx.mode === "platform" ? asCrossTenant("the apex marketplace lists every seller's catalog", view) : view();
}
