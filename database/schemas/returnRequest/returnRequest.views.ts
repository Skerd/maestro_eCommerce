import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const returnRequestSheetView: ViewConfig = {
    model: "returnRequests",
    viewType: "sheet",
    accessModel: "returnRequests",
    apiUrl: "/api/eCommerce/returnRequest",
    header: {titleField: "type", subtitleKey: "returnRequestSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconRefresh", languageKeyCategory: "returnType"}}},
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag"}}},
                        {render: "#SmallInfoCard", field: {name: "refundAmount", widget: "#SmallInfoCard", label: "refundAmount", widgetProps: {icon: "#IconCurrencyDollar"}}},
                    ],
                },
            ],
        },
    ],
};

export const returnRequestViews: ViewConfig[] = [returnRequestSheetView];
