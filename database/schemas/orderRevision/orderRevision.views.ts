import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const orderRevisionSheetView: ViewConfig = {
    model: "orderrevisions",
    viewType: "sheet",
    accessModel: "orderrevisions",
    apiUrl: "/api/eCommerceMarketplace/orderRevision",
    header: {
        titleField: "status",
        subtitleKey: "orderRevisionSubtitle",
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
                            permissions: {read: "requestedBy"},
                            field: {
                                name: "requestedBy",
                                widget: "#DisplayCard",
                                label: "requestedBy",
                                widgetProps: {icon: "#User", valuePath: ["requestedBy.name", "requestedBy.surname"], joinSeparator: " ", type: "user"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "orderRevisionStatus", type: "enum"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "reason"},
            children: [
                {
                    render: "#ExpandableText",
                    permissions: {read: "reason"},
                    field: {
                        name: "reason",
                        widget: "#ExpandableText",
                        label: "reason",
                    },
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const orderRevisionViews: ViewConfig[] = [orderRevisionSheetView];
