import type {DefaultRoleDefinition} from "@coreModule/database/schemas/role/role.defaults";

// RolePermission groups are the capitalised collection names.
const CATALOG_READ = ["Products", "Productvariants", "Productattributes", "Productcategories", "Productcollections"];

const catalogContentOwn = [...CATALOG_READ, "Cmsblocks", "Productreviews"];
const pricingOwn = ["Pricingrules", "Discounts", "Customergroups", "Customergroupmembers", "Taxzones"];
const catalogOwn = [...catalogContentOwn, ...pricingOwn, "Shippingzones", "Savedsearches"];
const ordersOwn = ["Productorders", "Fulfillments", "Returnrequests"];
const stockOwn = ["Warehouses", "Inventories", "Stocktransfers", "Stockcounts"];
const tillOwn = ["Posorders", "Possessions"];
const tillSetupOwn = ["Posconfigs", "Pospaymentmethods", "Fiscalconfigs"];
const odooOwn = ["Odooconnections", "Odoolinks"];
const marketplaceCatalogOwn = [
    "Listings",
    "Listingcategories",
    "Listingpackages",
    "Listingaddons",
    "Listingflags",
    "Promotions",
    "Providerprofiles",
];
const marketplaceDemandOwn = ["Taskrequests", "Marketplacebids", "Orders", "Bookings", "Disputes", "Reviews"];
const marketplaceLedgerRead = ["Orderdeliveries", "Ordermilestones", "Orderrevisions"];
const marketplaceOwn = [...marketplaceCatalogOwn, ...marketplaceDemandOwn];
// The stock ledger and buyer-side records are written by the system, so they are only ever read
const systemRead = ["Inventorymovements", "Carts", "Checkouts", "Customeraddresses", "Digitaldeliveries"];
const buyerRead = ["Carts", "Checkouts", "Customeraddresses", "Digitaldeliveries"];

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function ecomRole(
    name: string,
    slug: string,
    description: string,
    permissionGroups: string[],
    readPermissionGroups: string[],
): DefaultRoleDefinition {
    return {
        name,
        slug,
        description,
        isAdmin: false,
        isSignupDefault: false,
        canEdit: true,
        canDelete: false,
        permissionGroups,
        readPermissionGroups,
    };
}

export const eCommerceDefaultRoles: DefaultRoleDefinition[] = [
    ecomRole(
        "Store Manager",
        "ecom_store_manager",
        "Runs the store: catalog, pricing, orders, shipments, returns, stock, tills, and the marketplace.",
        [...catalogOwn, ...ordersOwn, ...stockOwn, ...tillOwn, ...tillSetupOwn, ...odooOwn, ...marketplaceOwn],
        [...systemRead, ...marketplaceLedgerRead],
    ),
    ecomRole(
        "Warehouse Operator",
        "ecom_warehouse_operator",
        "Ships orders, moves and counts stock. Can look up orders and the catalog but cannot change prices or refund.",
        ["Fulfillments", "Inventories", "Stocktransfers", "Stockcounts"],
        [...CATALOG_READ, "Productorders", "Returnrequests", "Warehouses", "Inventorymovements"],
    ),
    ecomRole(
        "Cashier",
        "ecom_cashier",
        "Sells and refunds at the till and runs the till session. Can look up the catalog and stock.",
        tillOwn,
        [...CATALOG_READ, "Inventories", "Warehouses", "Posconfigs", "Pospaymentmethods"],
    ),
    ecomRole(
        "Catalog Editor",
        "ecom_catalog_editor",
        "Maintains products, variants, categories, collections, storefront content, and reviews. Cannot change prices, discounts, orders, or stock.",
        catalogContentOwn,
        [...pricingOwn, "Shippingzones"],
    ),
    ecomRole(
        "Pricing Officer",
        "ecom_pricing_officer",
        "Sets pricing rules, discounts, customer groups, and tax zones. Can look up the catalog and shipping zones but cannot change them.",
        pricingOwn,
        [...CATALOG_READ, "Shippingzones"],
    ),
    ecomRole(
        "Order Manager",
        "ecom_order_manager",
        "Runs web orders through shipment and return. Can look up the catalog, stock, and the buyer trail but cannot change prices or stock rows.",
        ordersOwn,
        [...CATALOG_READ, "Warehouses", "Inventories", "Shippingzones", "Taxzones", ...buyerRead, "Inventorymovements"],
    ),
    ecomRole(
        "Customer Support",
        "ecom_customer_support",
        "Handles return requests and reviews. Can look up orders, shipments, the catalog, and the buyer trail but cannot refund an order or change the catalog.",
        ["Returnrequests", "Productreviews"],
        [...CATALOG_READ, "Productorders", "Fulfillments", ...buyerRead],
    ),
    ecomRole(
        "POS Supervisor",
        "ecom_pos_supervisor",
        "Configures tills, payment methods, and fiscal devices, and can sell at the till. Can look up the catalog and stock.",
        [...tillOwn, ...tillSetupOwn],
        [...CATALOG_READ, "Inventories", "Warehouses"],
    ),
    ecomRole(
        "Store Analyst",
        "ecom_analyst",
        "Read-only access across the catalog, orders, stock, tills, marketplace, and buyer records. Cannot change anything.",
        [],
        unique([
            ...catalogOwn,
            ...ordersOwn,
            ...stockOwn,
            ...tillOwn,
            ...tillSetupOwn,
            ...systemRead,
            ...marketplaceOwn,
            ...marketplaceLedgerRead,
        ]),
    ),
    ecomRole(
        "Marketplace Operator",
        "ecom_marketplace_operator",
        "Runs the services marketplace: listings, task requests, bids, escrowed orders, disputes, reviews, and provider profiles.",
        marketplaceOwn,
        marketplaceLedgerRead,
    ),
];
