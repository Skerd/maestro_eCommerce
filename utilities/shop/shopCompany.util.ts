import {ICompany} from "@coreModule/database/schemas/company/company";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

/**
 * Resolves the storefront tenant company from the request origin (public shop
 * domain). Mirrors propertyManagement's resolveMarketingCompany: exact
 * allowedDomains match first, wildcard company as local-dev fallback.
 */
export async function resolveShopCompany(
    origin: string,
    languageCode: string,
): Promise<ICompany> {
    const normalizedOrigin = (origin || "").toLowerCase().split(":")[0];

    if (normalizedOrigin) {
        const specific = await companyService.findOne({
            isActive: true,
            allowedDomains: normalizedOrigin,
        });
        if (specific) {
            return specific;
        }
    }

    const wildcard = await companyService.findOne({
        isActive: true,
        allowedDomains: "*",
    });
    if (wildcard) {
        return wildcard;
    }

    throw apiValidationException("company_not_found_for_origin", "origin", normalizedOrigin || origin, languageCode);
}
