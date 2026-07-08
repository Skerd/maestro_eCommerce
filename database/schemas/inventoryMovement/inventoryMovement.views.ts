import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const inventoryMovementSheetView: ViewConfig = {
    model: "inventoryMovements",
    viewType: "sheet",
    accessModel: "inventoryMovements",
    apiUrl: "/api/eCommerce/inventoryMovement",
    header: {titleField: "reason", subtitleKey: "inventoryMovementSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "quantity", widget: "#SmallInfoCard", label: "quantity", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "reason", widget: "#SmallInfoCard", label: "reason", widgetProps: {icon: "#Tag"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityBefore", widget: "#SmallInfoCard", label: "quantityBefore", widgetProps: {icon: "#IconChevronLeft"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityAfter", widget: "#SmallInfoCard", label: "quantityAfter", widgetProps: {icon: "#IconChevronRight"}}},
                    ],
                },
            ],
        },
    ],
};

export const inventoryMovementViews: ViewConfig[] = [inventoryMovementSheetView];
