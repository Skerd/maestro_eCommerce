import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const orderMilestoneSheetView: ViewConfig = {
    model: "ordermilestones",
    viewType: "sheet",
    accessModel: "ordermilestones",
    apiUrl: "/api/eCommerce/orderMilestone",
    header: {
        titleField: "name",
        subtitleKey: "eCommerce.orderMilestone",
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
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "currency"},
                            field: {
                                name: "currencySymbol",
                                widget: "#SmallInfoCard",
                                label: "currency",
                                widgetProps: {icon: "#Coins"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "amount"},
                            field: {
                                name: "amount",
                                widget: "#SmallInfoCard",
                                label: "amount",
                                widgetProps: {icon: "#DollarSign"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#SmallInfoCard",
                                label: "status",
                                widgetProps: {icon: "#Tag"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "orderIndex"},
                            field: {
                                name: "orderIndex",
                                widget: "#SmallInfoCard",
                                label: "orderIndex",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const orderMilestoneCreateFormView: ViewConfig = {
    model: "ordermilestones",
    viewType: "form",
    viewMode: "create",
    accessModel: "ordermilestones",
    apiUrl: "/api/eCommerce/orderMilestone",
    method: "PUT",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 2},
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
                        name: "name",
                        widget: "#Input",
                        label: "form.nameLabel",
                        required: true,
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "amount",
                        widget: "#Input",
                        label: "form.amountLabel",
                        required: true,
                        widgetProps: {type: "number", min: 0, step: "any"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "currencyId",
                        widget: "#ApiSelect",
                        label: "form.currencyLabel",
                        widgetProps: {apiUrl: "/api/finance/currency/select"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "orderIndex",
                        widget: "#Input",
                        label: "form.orderIndexLabel",
                        widgetProps: {type: "number", min: 0, step: 1},
                    },
                },
            ],
        },
    ],
};

export const orderMilestoneViews: ViewConfig[] = [orderMilestoneSheetView, orderMilestoneCreateFormView];
