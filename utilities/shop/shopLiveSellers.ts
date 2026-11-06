import {ObjectId} from "mongodb";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import {portalCompanyClause} from "@coreModule/utilities/marketing/portalCompanies";

/**
 * Mongo clause limiting platform browsing (the portal apex) to live seller companies:
 * eligible for eCommerce on the portal (active, not deleted, with the module, not hidden
 * by the platform owner) and opted in with `shopListedOnPortal`. Orphan docs whose
 * `company` was deleted stay out of the apex catalog/marketplace.
 */
export async function liveSellerCompanyClause(): Promise<{company: {$in: unknown[]}}> {
    return companyClause(liveSellerFilter());
}

/**
 * Mongo clause for what a portal session may buy: any eligible seller. The opt-in only
 * decides who is listed on the apex; a company's own site sells without it.
 */
export async function sellerCompanyClause(): Promise<{company: {$in: unknown[]}}> {
    return companyClause(portalCompanyClause("eCommerce"));
}

async function companyClause(filter: Record<string, unknown>): Promise<{company: {$in: unknown[]}}> {
    const rows = await companyService.find(filter, {withDeleted: false}, undefined, "_id");
    return {company: {$in: rows.map((row) => row._id)}};
}

function liveSellerFilter(): Record<string, unknown> {
    return {...portalCompanyClause("eCommerce"), shopListedOnPortal: true};
}

/**
 * Browse scope of the platform shop narrowed to one seller: that company while it is a
 * live seller, otherwise a company that matches nothing.
 */
export async function liveSellerScope(sellerCompanyId: string | undefined): Promise<unknown> {
    if (!sellerCompanyId || !ObjectId.isValid(sellerCompanyId)) return undefined;
    const seller = await companyService.findOne({_id: new ObjectId(sellerCompanyId), ...liveSellerFilter()}, {withDeleted: false}, undefined, "_id");
    return seller?._id ?? new ObjectId("000000000000000000000000");
}
