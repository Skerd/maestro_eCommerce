import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const orderRevisionSheetView: ViewConfig = {
    model: "orderrevisions",
    viewType: "sheet",
    accessModel: "orderrevisions",
    apiUrl: "/api/eCommerce/orderRevision",
    header: {
        titleField: "status",
        subtitleKey: "eCommerce.orderRevision",
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
                            render: "#SmallInfoCard",
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#SmallInfoCard",
                                label: "order",
                                widgetProps: {icon: "#Package", valuePath: ["order", "_id"]},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "delivery"},
                            field: {
                                name: "delivery",
                                widget: "#SmallInfoCard",
                                label: "delivery",
                                widgetProps: {icon: "#Truck", valuePath: ["delivery", "_id"]},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "requestedBy"},
                            field: {
                                name: "requestedBy",
                                widget: "#SmallInfoCard",
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
    apiUrl: "/api/eCommerce/orderRevision",
    method: "PUT",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 1},
            children: [
                {
                    render: "#Field",
                    field: {
                        name: "deliveryId",
                        widget: "#Input",
                        label: "form.deliveryIdLabel",
                        required: true,
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
