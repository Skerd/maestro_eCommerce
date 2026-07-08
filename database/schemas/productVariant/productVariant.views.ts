import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const productVariantSheetView: ViewConfig = {
    model: "productVariants",
    viewType: "sheet",
    accessModel: "productVariants",
    apiUrl: "/api/eCommerce/productVariant",
    header: {titleField: "sku", subtitleKey: "productVariantSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "sku"}, field: {name: "sku", widget: "#SmallInfoCard", label: "sku", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "price"}, field: {name: "price", widget: "#SmallInfoCard", label: "price", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "status"}, field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag"}}},
                    ],
                },
            ],
        },
    ],
};

export const productVariantViews: ViewConfig[] = [productVariantSheetView];
