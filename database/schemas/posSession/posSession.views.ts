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
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "state",
                                widget: "#DisplayCard",
                                label: "state",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "posSessionState", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
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
                            field: {
                                name: "openedAt",
                                widget: "#DisplayCard",
                                label: "openedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "closedAt",
                                widget: "#DisplayCard",
                                label: "closedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "company",
                                widget: "#DisplayCard",
                                label: "company",
                                widgetProps: {
                                    icon: "#IconBuilding",
                                    parent: "company",
                                    valuePath: ["name"],
                                },
                            },
                        },
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
                            field: {
                                name: "openingBalance",
                                widget: "#DisplayCard",
                                label: "openingBalance",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "closingBalance",
                                widget: "#DisplayCard",
                                label: "closingBalance",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "expectedCash",
                                widget: "#DisplayCard",
                                label: "expectedCash",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "cashRegisterBalance",
                                widget: "#DisplayCard",
                                label: "cashRegisterBalance",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
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
                            field: {
                                name: "orderCount",
                                widget: "#DisplayCard",
                                label: "orderCount",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "totalSales",
                                widget: "#DisplayCard",
                                label: "totalSales",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "totalCash",
                                widget: "#DisplayCard",
                                label: "totalCash",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "totalCard",
                                widget: "#DisplayCard",
                                label: "totalCard",
                                widgetProps: {icon: "#IconCreditCard", format: "locale", type: "locale"},
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
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "cashMoves",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
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
                            field: {
                                name: "notes",
                                widget: "#DisplayCard",
                                label: "notes",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const posSessionViews: ViewConfig[] = [posSessionSheetView];
