import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

// PosOrders are created by the till API — sheet-only like ProductOrder.
export const posOrderSheetView: ViewConfig = {
    model: "posOrders",
    viewType: "sheet",
    accessModel: "posOrders",
    apiUrl: "/api/eCommerce/posOrder",
    header: {titleField: "name", subtitleKey: "posOrderSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "state", widget: "#SmallInfoCard", label: "state", widgetProps: {icon: "#Tag", languageKeyCategory: "posOrderState"}}},
                        {render: "#SmallInfoCard", field: {name: "customerName", widget: "#SmallInfoCard", label: "customerName", widgetProps: {icon: "#IconUser"}}},
                        {render: "#SmallInfoCard", field: {name: "isRefund", widget: "#SmallInfoCard", label: "isRefund", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", field: {name: "note", widget: "#SmallInfoCard", label: "note", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", field: {name: "createdAt", widget: "#SmallInfoCard", label: "createdAt", widgetProps: {icon: "#Calendar"}}},
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
                        {render: "#SmallInfoCard", field: {name: "amountTotal", widget: "#SmallInfoCard", label: "amountTotal", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "amountTax", widget: "#SmallInfoCard", label: "amountTax", widgetProps: {icon: "#IconReceipt"}}},
                        {render: "#SmallInfoCard", field: {name: "discountTotal", widget: "#SmallInfoCard", label: "discountTotal", widgetProps: {icon: "#IconPercent"}}},
                        {render: "#SmallInfoCard", field: {name: "amountPaid", widget: "#SmallInfoCard", label: "amountPaid", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "amountReturn", widget: "#SmallInfoCard", label: "amountReturn", widgetProps: {icon: "#IconCurrencyDollar"}}},
                    ],
                },
            ],
        },
    ],
};

export const posOrderViews: ViewConfig[] = [posOrderSheetView];
