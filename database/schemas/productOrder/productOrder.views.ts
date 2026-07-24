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
                        {render: "#SmallInfoCard", field: {name: "fulfillmentStatus", widget: "#SmallInfoCard", label: "fulfillmentStatus", widgetProps: {icon: "#IconTruck", languageKeyCategory: "productOrderFulfillmentStatus"}}},
                        {render: "#SmallInfoCard", field: {name: "email", widget: "#SmallInfoCard", label: "email", widgetProps: {icon: "#IconMail"}}},
                        {render: "#SmallInfoCard", field: {name: "phone", widget: "#SmallInfoCard", label: "phone", widgetProps: {icon: "#IconPhone"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "totals"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "subtotal", widget: "#SmallInfoCard", label: "subtotal", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "discountTotal", widget: "#SmallInfoCard", label: "discountTotal", widgetProps: {icon: "#IconPercent"}}},
                        {render: "#SmallInfoCard", field: {name: "shippingTotal", widget: "#SmallInfoCard", label: "shippingTotal", widgetProps: {icon: "#IconTruck"}}},
                        {render: "#SmallInfoCard", field: {name: "taxTotal", widget: "#SmallInfoCard", label: "taxTotal", widgetProps: {icon: "#IconReceipt"}}},
                        {render: "#SmallInfoCard", field: {name: "grandTotal", widget: "#SmallInfoCard", label: "grandTotal", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "createdAt", widget: "#SmallInfoCard", label: "createdAt", widgetProps: {icon: "#Calendar"}}},
                    ],
                },
            ],
        },
    ],
};

export const productOrderViews: ViewConfig[] = [productOrderSheetView];
