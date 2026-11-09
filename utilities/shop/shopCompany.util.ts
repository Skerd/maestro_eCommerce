import type {ICompany} from "@coreModule/database/schemas/company/company";
import {resolveCompanyByOrigin, resolveSignupCompany} from "@coreModule/utilities/marketing/resolveCompanyByOrigin";
import {isPortalApexOrigin, isPortalZoneOrigin} from "@coreModule/utilities/marketing/portalOrigin";
import {allowForeignReferences, asCrossTenant, setRequestTenant} from "@coreModule/utilities/endpoints/tenantScope";
import type {ForeignReferenceAllowance} from "@coreModule/database/plugins/tenantReferences";

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

/**
 * Runs a purchase's seller work on the portal marketplace (D16): a cart or checkout opened in the portal zone buys
 * from every listed seller, so its product, stock, discount and order reads and writes span their companies, and each
 * write names its seller's `company` itself. Any other purchase runs in its own company's tenant, unchanged.
 * `marketplace` is `isPortalPurchase(origin)` for a request, or `spansSellers(checkout)` for work after it.
 */
export function inPortalMarketplace<T>(marketplace: boolean, work: () => Promise<T>): Promise<T> {
    return marketplace
        ? asCrossTenant("a portal marketplace purchase buys from every listed seller", () => allowForeignReferences(PORTAL_MARKETPLACE_REFERENCES, work))
        : work();
}

/**
 * The references a portal marketplace purchase stores across companies (D104): the platform's cart and checkout name
 * each seller's products, stock and currency. A seller's order stores its own country and state rows for the buyer's
 * address (D107). Every other reference must still point inside its record's company.
 */
const PORTAL_MARKETPLACE_REFERENCES: ForeignReferenceAllowance = {
    reason: "a portal marketplace purchase: the platform's cart and checkout list every seller's products",
    fields: [
        "Cart.items.product",
        "Cart.items.variant",
        "Checkout.items.product",
        "Checkout.items.variant",
        "Checkout.reservations.product",
        "Checkout.reservations.variant",
        "Checkout.reservations.warehouse",
        // The checkout is priced in its first line's seller's currency row (TD-B85).
        "Checkout.currency",
    ],
};

/** A request's cart or checkout is a portal marketplace purchase: it comes from the portal zone. */
export function isPortalPurchase(origin: string | undefined): boolean {
    return isPortalZoneOrigin(origin ?? "");
}

/** A route handler whose work runs on the portal marketplace when its request is a portal purchase. */
export function portalPurchaseRoute<P extends {origin?: string}, Q, R>(handler: (params: P, query: Q) => Promise<R>) {
    return (params: P, query: Q): Promise<R> => inPortalMarketplace(isPortalPurchase(params.origin), () => handler(params, query));
}
