import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const posSessionSheetView: ViewConfig = {
    model: "posSessions",
    viewType: "sheet",
    accessModel: "posSessions",
    apiUrl: "/api/eCommerce/posSession",
    header: {titleField: "name", subtitleKey: "posSessionSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "state"},
                            field: {
                                name: "state",
                                widget: "#DisplayCard",
                                label: "state",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "posSessionState", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "config"},
                            field: {
                                name: "config",
                                widget: "#DisplayCard",
                                label: "config",
                                widgetProps: {
                                    icon: "#IconTag",
                                    parent: "config",
                                    valuePath: ["name"],
                                    linkedRefPath: "config",
                                    linkedSheetModel: "posConfigs",
                                    linkedSheetWidget: "#PosConfigSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "openedBy"},
                            field: {
                                name: "openedBy",
                                widget: "#DisplayCard",
                                label: "openedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "openedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "closedBy"},
                            field: {
                                name: "closedBy",
                                widget: "#DisplayCard",
                                label: "closedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "closedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "openedAt"},
                            field: {
                                name: "openedAt",
                                widget: "#DisplayCard",
                                label: "openedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "closedAt"},
                            field: {
                                name: "closedAt",
                                widget: "#DisplayCard",
                                label: "closedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        }
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "balances", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "openingBalance"},
                            field: {
                                name: "openingBalance",
                                widget: "#DisplayCard",
                                label: "openingBalance",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "openingBalance"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "closingBalance"},
                            field: {
                                name: "closingBalance",
                                widget: "#DisplayCard",
                                label: "closingBalance",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "closingBalance"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "expectedCash"},
                            field: {
                                name: "expectedCash",
                                widget: "#DisplayCard",
                                label: "expectedCash",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "expectedCash"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "cashRegisterBalance"},
                            field: {
                                name: "cashRegisterBalance",
                                widget: "#DisplayCard",
                                label: "cashRegisterBalance",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "cashRegisterBalance"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "totals", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "orderCount"},
                            field: {
                                name: "orderCount",
                                widget: "#DisplayCard",
                                label: "orderCount",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "totalSales"},
                            field: {
                                name: "totalSales",
                                widget: "#DisplayCard",
                                label: "totalSales",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "totalSales"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "totalCash"},
                            field: {
                                name: "totalCash",
                                widget: "#DisplayCard",
                                label: "totalCash",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "totalCash"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "totalCard"},
                            field: {
                                name: "totalCard",
                                widget: "#DisplayCard",
                                label: "totalCard",
                                widgetProps: {
                                    icon: "#IconCreditCard",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "totalCard"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    type: "currency",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "posSession.sheet.cashMoves.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "cashMoves",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "cashMoves",
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "cashMoves",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            entityCards: true,
                                            columns: 1,
                                            compactSummaryFields: ["type", "amount"],
                                            fields: [
                                                {
                                                    name: "type",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    languageKeyCategory: "posCashMoveType",
                                                    labelKey: "cashMoveType",
                                                },
                                                {
                                                    name: "amount",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "cashMoveAmount",
                                                    currencyField: "currency",
                                                },
                                                {
                                                    name: "reason",
                                                    type: "expandableText",
                                                    className: "text-sm",
                                                    labelKey: "cashMoveReason",
                                                },
                                                {
                                                    name: "at",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "dateTime",
                                                    labelKey: "cashMoveAt",
                                                },
                                                {
                                                    name: "by",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    valuePath: ["name", "surname"],
                                                    joinSeparator: " ",
                                                    labelKey: "cashMoveBy",
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "notes", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "notes"},
                            field: {
                                name: "notes",
                                widget: "#DisplayCard",
                                label: "notes",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "posSession.sheet.posOrders.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "posOrders",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "posOrders",
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    field: {
                                        name: "posOrders",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#PosOrderCard",
                                            itemDataProp: "entity",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconReceipt",
                                                label: "posOrder",
                                                valuePath: ["name", "state", "amountTotal"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "posOrders",
                                                linkedSheetWidget: "#PosOrderSheetView",
                                                linkedSheetEntityProp: "entity",
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const posSessionViews: ViewConfig[] = [posSessionSheetView];
