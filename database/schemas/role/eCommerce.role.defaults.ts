import type {DefaultRoleDefinition} from "@coreModule/database/schemas/role/role.defaults";

// RolePermission groups are the capitalised collection names.
const CATALOG_READ = ["Products", "Productvariants", "Productattributes", "Productcategories", "Productcollections"];

const catalogOwn = [
    ...CATALOG_READ,
    "Pricingrules",
    "Discounts",
    "Customergroups",
    "Customergroupmembers",
    "Productreviews",
    "Cmsblocks",
    "Shippingzones",
    "Taxzones",
    "Savedsearches",
];
const ordersOwn = ["Productorders", "Fulfillments", "Returnrequests"];
const stockOwn = ["Warehouses", "Inventories", "Stocktransfers", "Stockcounts"];
const tillOwn = ["Posorders", "Possessions"];
const tillSetupOwn = ["Posconfigs", "Pospaymentmethods", "Fiscalconfigs"];
// The stock ledger and buyer-side records are written by the system, so they are only ever read
const systemRead = ["Inventorymovements", "Carts", "Checkouts", "Customeraddresses", "Digitaldeliveries"];

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
        "Runs the store: catalog, pricing, orders, shipments, returns, stock, and the tills.",
        [...catalogOwn, ...ordersOwn, ...stockOwn, ...tillOwn, ...tillSetupOwn],
        systemRead,
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
];
