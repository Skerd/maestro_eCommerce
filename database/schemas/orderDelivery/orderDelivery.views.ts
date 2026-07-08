import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const orderDeliverySheetView: ViewConfig = {
    model: "orderdeliveries",
    viewType: "sheet",
    accessModel: "orderdeliveries",
    apiUrl: "/api/eCommerce/orderDelivery",
    header: {
        titleField: "status",
        subtitleKey: "eCommerce.orderDelivery",
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
                                name: "orderId",
                                widget: "#SmallInfoCard",
                                label: "order",
                                widgetProps: {icon: "#Package"},
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
    ],
};

export const orderDeliveryCreateFormView: ViewConfig = {
    model: "orderdeliveries",
    viewType: "form",
    viewMode: "create",
    accessModel: "orderdeliveries",
    apiUrl: "/api/eCommerce/orderDelivery",
    method: "PUT",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 1},
            children: [
                {
                    render: "#Field",
                    field: {
                        name: "orderId",
                        widget: "#ApiSelect",
                        label: "form.orderIdLabel",
                        required: true,
                        widgetProps: {apiUrl: "/api/eCommerceMarketplace/order/select"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "message",
                        widget: "#Textarea",
                        label: "form.messageLabel",
                        widgetProps: {className: "min-h-[120px]"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "attachmentIds",
                        widget: "#MediaField",
                        label: "form.attachmentsLabel",
                        widgetProps: {
                            mediaType: "file",
                            mode: "multiple",
                            maxCount: 20,
                        },
                    },
                },
            ],
        },
    ],
};

export const orderDeliveryViews: ViewConfig[] = [orderDeliverySheetView, orderDeliveryCreateFormView];
