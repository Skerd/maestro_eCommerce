import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const paymentTransactionSheetView: ViewConfig = {
    model: "paymentTransactions",
    viewType: "sheet",
    accessModel: "paymentTransactions",
    apiUrl: "/api/eCommerce/paymentTransaction",
    header: {titleField: "gatewayTransactionId", subtitleKey: "paymentTransactionSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "gateway", widget: "#SmallInfoCard", label: "gateway", widgetProps: {icon: "#IconCreditCard"}}},
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#IconActivity"}}},
                        {render: "#SmallInfoCard", field: {name: "amount", widget: "#SmallInfoCard", label: "amount", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconTag"}}},
                    ],
                },
            ],
        },
    ],
};

export const paymentTransactionViews: ViewConfig[] = [paymentTransactionSheetView];
