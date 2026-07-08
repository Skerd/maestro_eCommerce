import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const productOrderSheetView: ViewConfig = {
    model: "productOrders",
    viewType: "sheet",
    accessModel: "productOrders",
    apiUrl: "/api/eCommerce/productOrder",
    header: {titleField: "orderNumber", subtitleKey: "productOrderSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "orderNumber", widget: "#SmallInfoCard", label: "orderNumber", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "productOrderStatus"}}},
                        {render: "#SmallInfoCard", field: {name: "paymentStatus", widget: "#SmallInfoCard", label: "paymentStatus", widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "productOrderPaymentStatus"}}},
                        {render: "#SmallInfoCard", field: {name: "grandTotal", widget: "#SmallInfoCard", label: "grandTotal", widgetProps: {icon: "#IconCurrencyDollar"}}},
                    ],
                },
            ],
        },
    ],
};

export const productOrderViews: ViewConfig[] = [productOrderSheetView];
