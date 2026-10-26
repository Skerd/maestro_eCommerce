import {registerPortalProvider} from "@coreModule/domain/portal/portalProviderRegistry";
import {
    companyAddressCities,
    portalCompanyRefs,
    portalListedCompanyIds,
} from "@coreModule/utilities/marketing/portalCompanies";
import {publicMediaUrl} from "@coreModule/utilities/media/publicMediaUrl";
import Product from "@eCommerceModule/database/schemas/product/product";
import {buildShopCatalogFilter} from "@eCommerceModule/utilities/shop/shopCatalogFilter";

/** Sellers on the portal and the shop apex: same rule as `liveSellerCompanyClause`. */
export function shopPortalCompanyIds() {
    return portalListedCompanyIds("eCommerce", {companyFilter: {shopListedOnPortal: true}});
}

/** The shop section of the portal: the all-sellers shop, with products matched by title. */
export function registerShopPortalProvider(): void {
    registerPortalProvider({
        key: "shop",
        order: 10,
        companyPath: (company) => `/shop/products?seller=${company._id}`,
        listedCompanyIds: shopPortalCompanyIds,
        citiesByCompany: companyAddressCities,
        async search({query, companyIds, limit}) {
            const filter = await buildShopCatalogFilter({search: query});
            if (!filter) return [];
            const products = await Product.find({...filter, company: {$in: companyIds}}).noDeleted()
                .select("company title slug mainImage").sort({title: 1}).limit(limit).lean();
            const companies = await portalCompanyRefs(products.map((product) => product.company as any));
            return products.flatMap((product: any) => {
                const company = companies.get(String(product.company));
                return company ? [{
                    kind: "product",
                    title: product.title,
                    subtitle: company.name,
                    image: publicMediaUrl(product.mainImage),
                    path: `/shop/product?slug=${encodeURIComponent(product.slug)}&seller=${product.company}`,
                    company,
                }] : [];
            });
        },
    });
}
