import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const fulfillmentSheetView: ViewConfig = {
    model: "fulfillments",
    viewType: "sheet",
    accessModel: "fulfillments",
    apiUrl: "/api/eCommerce/fulfillment",
    header: {titleField: "trackingNumber", subtitleKey: "fulfillmentSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag"}}},
                        {render: "#SmallInfoCard", field: {name: "carrier", widget: "#SmallInfoCard", label: "carrier", widgetProps: {icon: "#IconTruck"}}},
                        {render: "#SmallInfoCard", field: {name: "trackingNumber", widget: "#SmallInfoCard", label: "trackingNumber", widgetProps: {icon: "#Hash"}}},
                    ],
                },
            ],
        },
    ],
};

export const fulfillmentViews: ViewConfig[] = [fulfillmentSheetView];
