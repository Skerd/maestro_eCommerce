import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const orderSheetView: ViewConfig = {
    model: "orders",
    viewType: "sheet",
    accessModel: "orders",
    apiUrl: "/api/eCommerceMarketplace/order",
    header: {
        titleField: "listing.title",
        subtitleKey: "order",
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
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "orderStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "amount"},
                            field: {
                                name: "amount",
                                widget: "#DisplayCard",
                                label: "amount",
                                widgetProps: {
                                    icon: "#DollarSign",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "amount"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "customer"},
                            field: {
                                name: "customer",
                                widget: "#DisplayCard",
                                label: "customer",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["customer.name", "customer.surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "provider"},
                            field: {
                                name: "provider",
                                widget: "#DisplayCard",
                                label: "provider",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["provider.name", "provider.surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "deliveryDueDate"},
                            field: {
                                name: "deliveryDueDate",
                                widget: "#DisplayCard",
                                label: "deliveryDueDate",
                                widgetProps: {icon: "#Calendar", format: "date", type: "date"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "currency"},
                            field: {
                                name: "currency",
                                widget: "#DisplayCard",
                                label: "currency",
                                widgetProps: {
                                    icon: "#Coins",
                                    valuePath: ["currency.symbol", "currency.name"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    linkedSheetValueField: "name",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "references"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "listing"},
                            field: {
                                name: "listing",
                                widget: "#DisplayCard",
                                label: "listingLabel",
                                widgetProps: {
                                    icon: "#Package",
                                    valuePath: ["listing.title"],
                                    linkedRefPath: "listing",
                                    linkedSheetModel: "listings",
                                    linkedSheetWidget: "#ListingSheetView",
                                    linkedSheetEntityProp: "listing",
                                    linkedSheetValueField: "title",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "taskRequest"},
                            field: {
                                name: "taskRequest",
                                widget: "#DisplayCard",
                                label: "taskRequest",
                                widgetProps: {
                                    icon: "#Briefcase",
                                    valuePath: ["taskRequest.title"],
                                    linkedRefPath: "taskRequest",
                                    linkedSheetModel: "taskRequests",
                                    linkedSheetWidget: "#TaskRequestSheetView",
                                    linkedSheetEntityProp: "entity",
                                    linkedSheetValueField: "title",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "bid"},
                            field: {
                                name: "bid",
                                widget: "#DisplayCard",
                                label: "bid",
                                widgetProps: {
                                    icon: "#FileText",
                                    valuePath: ["bid.name"],
                                    linkedRefPath: "bid",
                                    linkedSheetModel: "marketplacebids",
                                    linkedSheetWidget: "#BidSheetView",
                                    linkedSheetEntityProp: "bid",
                                    linkedSheetValueField: "name",
                                },
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const orderViews: ViewConfig[] = [orderSheetView];
