import {registerRoomDisplayNames} from "@coreModule/websocket/roomRegistry";

/**
 * Site rooms for eCommerce (catalog) panel paths
 * (e.g. `/eCommerce/products` → room `products` via withSiteRoom).
 *
 * Keep in sync with eCommerce sidebarContribution + routeConfigContribution.
 */
export function registerECommerceRoomContributions(): void {
    registerRoomDisplayNames({
        escrowdashboard: "Escrow dashboard",
        products: "Products",
        collections: "Collections",
        categories: "Categories",
        productvariants: "Product variants",
        productorders: "Product orders",
        fulfillments: "Fulfillments",
        returnrequests: "Return requests",
        paymenttransactions: "Payment transactions",
        customeraddresses: "Customer addresses",
        productreviews: "Product reviews",
        giftcards: "Gift cards",
        inventories: "Inventories",
        warehouses: "Warehouses",
        productattributes: "Product attributes",
        discounts: "Discounts",
        taxzones: "Tax zones",
        shippingzones: "Shipping zones",
        cmsblocks: "CMS blocks",
        customergroups: "Customer groups",
        pricingrules: "Pricing rules",
        analytics: "Analytics",
        // Tenancy system-settings resource owned by this module
        categories_configurations: "Categories configurations",
    });
}
