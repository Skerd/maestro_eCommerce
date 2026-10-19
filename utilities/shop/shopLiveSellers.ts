import Company from "@coreModule/database/schemas/company/company";

/**
 * Mongo clause limiting platform queries to live seller companies.
 * Orphan docs whose `company` was deleted stay out of apex catalog/marketplace.
 */
export async function liveSellerCompanyClause(): Promise<{company: {$in: unknown[]}}> {
    const rows = await Company.find({isActive: true}, {_id: 1}).noDeleted().lean();
    return {company: {$in: rows.map((row) => row._id)}};
}
