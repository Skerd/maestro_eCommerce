import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const orderMilestoneSheetView: ViewConfig = {
    model: "ordermilestones",
    viewType: "sheet",
    accessModel: "ordermilestones",
    apiUrl: "/api/eCommerceMarketplace/orderMilestone",
    header: {
        titleField: "name",
        subtitleKey: "orderMilestoneSubtitle",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#DisplayCard",
                                label: "order",
                                widgetProps: {
                                    icon: "#Package",
                                    valuePath: ["order.status"],
                                    linkedRefPath: "order",
                                    linkedSheetModel: "orders",
                                    linkedSheetWidget: "#OrderSheetView",
                                    linkedSheetEntityProp: "order",
                                    linkedSheetValueField: "status",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "amount"},
                            field: {
                                name: "amount",
                                widget: "#DisplayCard",
                                label: "amount",
                                widgetProps: {icon: "#DollarSign", format: "locale", valuePath: ["currency.symbol", "amount"], joinSeparator: " "},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "orderMilestoneStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "orderIndex"},
                            field: {
                                name: "orderIndex",
                                widget: "#DisplayCard",
                                label: "orderIndex",
                                widgetProps: {icon: "#Hash", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const orderMilestoneViews: ViewConfig[] = [orderMilestoneSheetView];
