import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const checkoutSheetView: ViewConfig = {
    model: "checkouts",
    viewType: "sheet",
    accessModel: "checkouts",
    apiUrl: "/api/eCommerce/checkout",
    header: {titleField: "idempotencyKey", subtitleKey: "checkoutSubtitle", showCloseButton: true},
    nodes: [],
};

export const checkoutViews: ViewConfig[] = [checkoutSheetView];
