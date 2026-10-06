import {registerRoomDisplayNames} from "@coreModule/websocket/roomRegistry";

/**
 * Site rooms for eCommerce (catalog) panel paths
 * (e.g. `/eCommerce/products` → room `products` via SiteRoomProvider).
 *
 * Keep in sync with eCommerce sidebarContribution + routeConfigContribution.
 */
export function registerECommerceRoomContributions(): void {
    registerRoomDisplayNames({
        products: "Products",
        collections: "Collections",
        categories: "Categories",
        productorders: "Product orders",
        fulfillments: "Fulfillments",
        returnrequests: "Return requests",
        customeraddresses: "Addresses",
        productreviews: "Product reviews",
        inventories: "Inventories",
        analytics: "Analytics",
        // Tenancy system-settings resource owned by this module
        categories_configurations: "Categories configurations",
        productAttributes_configurations: "Product attributes configurations",
        productVariants_configurations: "Product variants configurations",
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
    });
}
