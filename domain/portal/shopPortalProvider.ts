import type {ObjectId} from "mongodb";
import {registerPortalProvider} from "@coreModule/domain/portal/portalProviderRegistry";
import type {PortalBrowseParams} from "@coreModule/domain/portal/portalProvider.types";
import {catalogItems, catalogRating, filterValue, filterValues} from "@coreModule/domain/portal/portalCatalog";
import {companyAddressCities, portalListedCompanyIds, type PortalScope} from "@coreModule/utilities/marketing/portalCompanies";
import {publicMediaUrl} from "@coreModule/utilities/media/publicMediaUrl";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {PORTAL_CURRENCY_SELECT} from "@coreModule/utilities/mappers/portal/portalStorefrontMapper.dto";
import {buildShopCatalogFilter, refineShopCatalogFilter, SHOP_PRODUCT_SORT_SPECS} from "@eCommerceModule/utilities/shop/shopCatalogFilter";

/** Sellers in `scope`: on the apex the same rule as `liveSellerCompanyClause`. */
export function shopPortalCompanyIds(scope: PortalScope) {
    return portalListedCompanyIds("eCommerce", {companyListedOn: {shopListedOnPortal: true}}, scope);
}

type CurrencyRef = {abbreviation?: string};

/** Active products, with the shop's own category (`f.category`) and brand (`f.brand`) filters. */
async function browseProducts({scope, companyIds, query, priceMin, priceMax, sort, skip, limit, filters}: PortalBrowseParams) {
    const filter = await buildShopCatalogFilter({companyId: scope.companyId, search: query, categorySlug: filterValue(filters, "category")});
    if (!filter) return {items: [], total: 0};
    filter.company = {$in: companyIds};
    await refineShopCatalogFilter(filter, {priceMin, priceMax, brands: filterValues(filters, "brand")});
    const [products, total] = await Promise.all([
        productService.findCatalogRows<{_id: ObjectId; company: ObjectId; title: string; slug: string; mainImage?: ObjectId; price?: number; currency?: CurrencyRef; brand?: string; categories?: {name?: string}[]; ratingAverage?: number; ratingCount?: number}>(filter, {
            select: "company title slug mainImage price currency brand categories ratingAverage ratingCount",
            populate: [{path: "currency", select: PORTAL_CURRENCY_SELECT}, {path: "categories", select: "name"}],
            sort: SHOP_PRODUCT_SORT_SPECS[sort ?? "newest"],
            skip,
            limit,
        }),
        productService.count(filter, {withDeleted: false}),
    ]);
    const items = await catalogItems(products, (product) => ({
        kind: "product",
        id: product._id.toString(),
        title: product.title,
        // The card's second line: the brand people shop by, else the product's first category.
        subtitle: product.brand || product.categories?.[0]?.name,
        image: publicMediaUrl(product.mainImage),
        ...(product.price != null && product.currency?.abbreviation ? {price: {amount: product.price, currency: product.currency.abbreviation}} : {}),
        ...catalogRating(product.ratingAverage, product.ratingCount),
        section: "shop",
        path: `/product?${new URLSearchParams({id: product._id.toString(), slug: product.slug, seller: product.company.toString()})}`,
    }));
    return {items, total};
}

/** The shop section of the portal: the products of every seller in scope. */
export function registerShopPortalProvider(): void {
    registerPortalProvider({
        key: "shop",
        order: 10,
        kinds: ["product"],
        companyIds: shopPortalCompanyIds,
        citiesByCompany: companyAddressCities,
        browse: browseProducts,
    });
}
