import type {ObjectId} from "mongodb";
import {registerPortalProvider} from "@coreModule/domain/portal/portalProviderRegistry";
import type {PortalBrowseParams} from "@coreModule/domain/portal/portalProvider.types";
import {catalogItems, filterValue, filterValues} from "@coreModule/domain/portal/portalCatalog";
import {companyAddressCities, portalListedCompanyIds, type PortalScope} from "@coreModule/utilities/marketing/portalCompanies";
import {publicMediaUrl} from "@coreModule/utilities/media/publicMediaUrl";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {SHOP_CURRENCY_SELECT} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";
import {buildShopCatalogFilter, refineShopCatalogFilter, SHOP_PRODUCT_SORT_SPECS} from "@eCommerceModule/utilities/shop/shopCatalogFilter";
import {buildShopListingFilter, SHOP_LISTING_SORT_SPECS} from "@eCommerceModule/utilities/shop/shopMarketplaceFilter";

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
        productService.findCatalogRows<{_id: ObjectId; company: ObjectId; title: string; slug: string; mainImage?: ObjectId; price?: number; currency?: CurrencyRef; brand?: string; categories?: {name?: string}[]}>(filter, {
            select: "company title slug mainImage price currency brand categories",
            populate: [{path: "currency", select: SHOP_CURRENCY_SELECT}, {path: "categories", select: "name"}],
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
        section: "shop",
        path: `/product?${new URLSearchParams({id: product._id.toString(), slug: product.slug, seller: product.company.toString()})}`,
    }));
    return {items, total};
}

/** Active service listings, with the marketplace's own category filter (`f.category`). */
async function browseServices({scope, companyIds, query, priceMin, priceMax, sort, skip, limit, filters}: PortalBrowseParams) {
    const filter = await buildShopListingFilter(scope.companyId, {search: query, categorySlug: filterValue(filters, "category"), priceMin, priceMax});
    if (!filter) return {items: [], total: 0};
    filter.company = {$in: companyIds};
    const [listings, total] = await Promise.all([
        listingService.findCatalogRows<{_id: ObjectId; company: ObjectId; title: string; mainImage?: ObjectId; price?: number; priceCurrency?: CurrencyRef; address?: {city?: {name?: string}}; category?: {name?: string}}>(filter, {
            select: "company title mainImage price priceCurrency address.city category",
            populate: [{path: "priceCurrency", select: SHOP_CURRENCY_SELECT}, {path: "address.city", select: "name"}, {path: "category", select: "name"}],
            sort: SHOP_LISTING_SORT_SPECS[sort ?? "newest"],
            skip,
            limit,
        }),
        listingService.count(filter, {withDeleted: false}),
    ]);
    const items = await catalogItems(listings, (listing) => ({
        kind: "service",
        id: listing._id.toString(),
        title: listing.title,
        subtitle: listing.category?.name,
        image: publicMediaUrl(listing.mainImage),
        ...(listing.price != null && listing.priceCurrency?.abbreviation ? {price: {amount: listing.price, currency: listing.priceCurrency.abbreviation}} : {}),
        city: listing.address?.city?.name,
        section: "shop",
        path: `/service?${new URLSearchParams({id: listing._id.toString()})}`,
    }));
    return {items, total};
}

/** The shop section of the portal: products and service listings of every seller in scope. */
export function registerShopPortalProvider(): void {
    registerPortalProvider({
        key: "shop",
        order: 10,
        kinds: ["product", "service"],
        companyIds: shopPortalCompanyIds,
        citiesByCompany: companyAddressCities,
        browse: (params) => params.kind === "product" ? browseProducts(params) : browseServices(params),
    });
}
