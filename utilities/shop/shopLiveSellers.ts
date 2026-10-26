import {ObjectId} from "mongodb";
import Company from "@coreModule/database/schemas/company/company";
import {portalCompanyClause} from "@coreModule/utilities/marketing/portalCompanies";

/**
 * Mongo clause limiting platform queries (shop apex and portal) to live seller companies:
 * listable on the portal for eCommerce (active, not deleted, with the module, not hidden
 * by the platform owner) and opted in with `shopListedOnPortal`. Orphan docs whose
 * `company` was deleted stay out of apex catalog/marketplace.
 */
export async function liveSellerCompanyClause(): Promise<{company: {$in: unknown[]}}> {
    const rows = await Company.find(liveSellerFilter(), {_id: 1}).noDeleted().lean();
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
    const seller = await Company.findOne({_id: new ObjectId(sellerCompanyId), ...liveSellerFilter()}, {_id: 1}).noDeleted().lean();
    return seller?._id ?? new ObjectId("000000000000000000000000");
}
