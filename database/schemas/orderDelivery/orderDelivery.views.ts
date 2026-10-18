import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const orderDeliverySheetView: ViewConfig = {
    model: "orderdeliveries",
    viewType: "sheet",
    accessModel: "orderdeliveries",
    apiUrl: "/api/eCommerceMarketplace/orderDelivery",
    header: {
        titleField: "status",
        subtitleKey: "orderDeliverySubtitle",
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
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "orderDeliveryStatus", type: "enum"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "message"},
            children: [
                {
                    render: "#ExpandableText",
                    permissions: {read: "message"},
                    field: {
                        name: "message",
                        widget: "#ExpandableText",
                        label: "message",
                    },
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "attachments"},
            children: [
                {
                    render: "#SheetMediaFilesStrip",
                    permissions: {read: "attachments"},
                    field: {
                        name: "attachments",
                        widget: "#SheetMediaFilesStrip",
                        widgetProps: {canDownload: true, canRemove: false, isBig: false},
                    },
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const orderDeliveryViews: ViewConfig[] = [orderDeliverySheetView];
