import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const bidSheetView: ViewConfig = {
    model: "marketplacebids",
    viewType: "sheet",
    accessModel: "marketplacebids",
    apiUrl: "/api/eCommerceMarketplace/bid",
    header: {
        titleField: "name",
        subtitleKey: "bid",
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
                                widgetProps: {icon: "#Tag", languageKeyCategory: "bidStatus"},
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
                            permissions: {read: "deliveryDays"},
                            field: {
                                name: "deliveryDays",
                                widget: "#DisplayCard",
                                label: "deliveryDays",
                                widgetProps: {icon: "#Calendar"},
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
                            permissions: {read: "bidder"},
                            field: {
                                name: "bidder",
                                widget: "#DisplayCard",
                                label: "bidder",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["bidder.name", "bidder.surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "proposal"},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "proposal"},
                            field: {
                                name: "proposal",
                                widget: "#ExpandableText",
                                label: "proposal",
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

const bidCreateFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 3},
        children: [
            {
                render: "#Field",
                field: {
                    name: "taskRequest",
                    widget: "#ApiSelect",
                    label: "form.taskRequestIdLabel",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerceMarketplace/taskRequest/select",
                        postBody: {activeOnly: true},
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "amount",
                    widget: "#Input",
                    label: "form.amountLabel",
                    placeholder: "form.amountPlaceholder",
                    required: true,
                    widgetProps: {type: "number", min: 0, step: "any"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "deliveryDays",
                    widget: "#Input",
                    label: "form.deliveryDaysLabel",
                    placeholder: "form.deliveryDaysPlaceholder",
                    required: true,
                    widgetProps: {type: "number", min: 0, step: 1},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "proposal",
                    widget: "#Textarea",
                    label: "form.proposalLabel",
                    placeholder: "form.proposalPlaceholder",
                    required: true,
                    widgetProps: {className: "resize-none max-h-[250px] overflow-y-auto"},
                },
            },
        ],
    },
];

export const bidCreateFormView: ViewConfig = {
    model: "marketplacebids",
    viewType: "form",
    viewMode: "create",
    accessModel: "marketplacebids",
    apiUrl: "/api/eCommerceMarketplace/bid",
    method: "PUT",
    nodes: bidCreateFields,
};

export const bidViews: ViewConfig[] = [bidSheetView, bidCreateFormView];
