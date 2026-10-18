import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

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
                                widgetProps: {icon: "#Package", valuePath: ["order", "_id"]},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "delivery"},
                            field: {
                                name: "delivery",
                                widget: "#DisplayCard",
                                label: "delivery",
                                widgetProps: {icon: "#Truck", valuePath: ["delivery", "_id"]},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "requestedBy"},
                            field: {
                                name: "requestedBy",
                                widget: "#DisplayCard",
                                label: "requestedBy",
                                widgetProps: {icon: "#User", valuePath: ["requestedBy", "fullName"]},
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
    ],
};

export const orderRevisionCreateFormView: ViewConfig = {
    model: "orderrevisions",
    viewType: "form",
    viewMode: "create",
    accessModel: "orderrevisions",
    apiUrl: "/api/eCommerceMarketplace/order/requestRevision",
    method: "POST",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 1},
            children: [
                {
                    render: "#Field",
                    field: {
                        name: "_id",
                        widget: "#ApiSelect",
                        label: "form.orderIdLabel",
                        required: true,
                        widgetProps: {apiUrl: "/api/eCommerceMarketplace/order/select"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "reason",
                        widget: "#Textarea",
                        label: "form.reasonLabel",
                        required: true,
                        widgetProps: {className: "min-h-[120px]"},
                    },
                },
            ],
        },
    ],
};

export const orderRevisionViews: ViewConfig[] = [orderRevisionSheetView, orderRevisionCreateFormView];
