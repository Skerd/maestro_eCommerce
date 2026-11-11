import type {ForeignReferenceAllowance} from "@coreModule/database/plugins/tenantReferences";
import {inPortalPurchase, portalPurchaseRoute} from "@coreModule/utilities/marketing/portalStorefront";

/**
 * The references a portal shop purchase stores across companies (D104): the platform's cart and checkout name each
 * seller's products, stock and currency. A seller's order stores its own country and state rows for the buyer's
 * address (D107). Every other reference must still point inside its record's company.
 */
const SHOP_PURCHASE_REFERENCES: ForeignReferenceAllowance = {
    reason: "a portal shop purchase: the platform's cart and checkout list every seller's products",
    fields: [
        "Cart.items.product",
        "Cart.items.variant",
        "Checkout.items.product",
        "Checkout.items.variant",
        "Checkout.reservations.product",
        "Checkout.reservations.variant",
        "Checkout.reservations.warehouse",
        // The checkout is priced in its first line's seller's currency row (TD-B85).
        "Checkout.currency",
    ],
};

/**
 * Runs a shop purchase's seller work on the portal (core `inPortalPurchase` with the shop's cart and checkout
 * references). `spansSellers` is `isPortalPurchase(origin)` for a request, or `spansSellers(checkout)` for work after it.
 */
export function inShopPurchase<T>(spansSellers: boolean, work: () => Promise<T>): Promise<T> {
    return inPortalPurchase(spansSellers, work, SHOP_PURCHASE_REFERENCES);
}

/** A shop route handler whose work runs through `inShopPurchase` when its request is a portal purchase. */
export function shopPurchaseRoute<P extends {origin?: string}, Q, R>(handler: (params: P, query: Q) => Promise<R>) {
    return portalPurchaseRoute(handler, SHOP_PURCHASE_REFERENCES);
}
