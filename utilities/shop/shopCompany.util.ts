import {resolveCompanyByOrigin} from "@coreModule/utilities/marketing/resolveCompanyByOrigin";

/**
 * Resolves the storefront tenant company from the request origin (public shop
 * domain). Same rule as every other public surface — exact allowedDomains
 * match first, wildcard company as local-dev fallback — so it delegates to core.
 */
export const resolveShopCompany = resolveCompanyByOrigin;
