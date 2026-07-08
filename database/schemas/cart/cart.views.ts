import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const cartSheetView: ViewConfig = {
    model: "carts",
    viewType: "sheet",
    accessModel: "carts",
    apiUrl: "/api/eCommerce/cart",
    header: {titleField: "_id", subtitleKey: "cartSubtitle", showCloseButton: true},
    nodes: [],
};

export const cartViews: ViewConfig[] = [cartSheetView];
