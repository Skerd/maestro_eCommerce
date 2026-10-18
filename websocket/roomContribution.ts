import {registerRoomDisplayNames} from "@coreModule/websocket/roomRegistry";

/**
 * Site rooms for eCommerce panel paths (product commerce + marketplace).
 * Keep in sync with eCommerce sidebarContribution + routeConfigContribution.
 */
export function registerECommerceRoomContributions(): void {
    registerRoomDisplayNames({
        products: "Products",
        categories: "Categories",
        productorders: "Product orders",
        fulfillments: "Fulfillments",
        returnrequests: "Return requests",
        customeraddresses: "Addresses",
        productreviews: "Product reviews",
        inventories: "Inventories",
        analytics: "Analytics",
        odooimport: "Odoo import",
        // Marketplace (`/eCommerceMarketplace/...`)
        marketplacesystemmap: "Marketplace system map",
        listings: "Listings",
        listingflags: "Listing flags",
        promotions: "Promotions",
        taskrequests: "Task requests",
        bids: "Bids",
        orders: "Orders",
        disputes: "Disputes",
        reviews: "Reviews",
        bookings: "Bookings",
        providerprofile: "Provider profile",
        listingaddons: "Listing add-ons",
        listingpackages: "Listing packages",
        listingcategories: "Listing categories",
        // Tenancy system-settings resource owned by this module
        categories_configurations: "Categories configurations",
        productAttributes_configurations: "Product attributes configurations",
        productVariants_configurations: "Product variants configurations",
        productCollections_configurations: "Product collections configurations",
        customerGroups_configurations: "Customer groups configurations",
        customerAddresses_configurations: "Customer addresses configurations",
        discounts_configurations: "Discounts configurations",
        pricingRules_configurations: "Pricing rules configurations",
        warehouses_configurations: "Warehouses configurations",
        shippingZones_configurations: "Shipping zones configurations",
        taxZones_configurations: "Tax zones configurations",
        posConfigs_configurations: "POS configs configurations",
        posPaymentMethods_configurations: "POS payment methods configurations",
        fiscalConfigs_configurations: "Fiscal configs configurations",
        cmsBlocks_configurations: "CMS blocks configurations",
        odooConnection_configurations: "Odoo connection",
        odooimport_configurations: "Odoo import",
        listingcategories_configurations: "Listing categories configurations",
    });
}
