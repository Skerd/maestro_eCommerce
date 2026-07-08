import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

/** Read-oriented model: transactions are created by services, not via generic CRUD form. */
export const escrowTransactionSheetView: ViewConfig = {
    model: "escrowtransactions",
    viewType: "sheet",
    accessModel: "escrowtransactions",
    apiUrl: "/api/eCommerce/escrowTransaction",
    header: {
        titleField: "type",
        subtitleKey: "eCommerce.escrowTransaction",
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
                                widgetProps: {
                                    icon: "#Package",
                                    valuePath: ["order", "_id"],
                                },
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
                            permissions: {read: "currency"},
                            field: {
                                name: "currency",
                                widget: "#SmallInfoCard",
                                label: "currency",
                                widgetProps: {
                                    icon: "#Coins",
                                    valuePath: ["currency", "symbol"],
                                },
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
                            permissions: {read: "recipient"},
                            field: {
                                name: "recipient",
                                widget: "#SmallInfoCard",
                                label: "recipient",
                                widgetProps: {icon: "#User"},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const escrowTransactionViews: ViewConfig[] = [escrowTransactionSheetView];
