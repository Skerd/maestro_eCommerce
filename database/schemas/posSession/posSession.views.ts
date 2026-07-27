import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const posSessionCreateFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "config",
                    widget: "#ApiSelect",
                    label: "form.configLabel",
                    placeholder: "form.configPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerce/posConfig/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "openingBalance",
                    widget: "#Input",
                    label: "form.openingBalanceLabel",
                    required: true,
                    widgetProps: {type: "number", min: 0},
                },
            },
        ],
    },
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {render: "#Field", field: {name: "notes", widget: "#Textarea", label: "form.notesLabel"}},
        ],
    },
];

const posSessionEditFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {render: "#Field", field: {name: "notes", widget: "#Textarea", label: "form.notesLabel"}},
        ],
    },
];

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
                            render: "#SmallInfoCard",
                            field: {
                                name: "name",
                                widget: "#SmallInfoCard",
                                label: "name",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "state",
                                widget: "#SmallInfoCard",
                                label: "state",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "posSessionState"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "config",
                                widget: "#SmallInfoCard",
                                label: "config",
                                widgetProps: {
                                    icon: "#IconTag",
                                    parent: "configLabel",
                                    valuePath: ["name"],
                                    linkedRefPath: "config",
                                    linkedSheetModel: "posConfigs",
                                    linkedSheetWidget: "#PosConfigSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "openedBy",
                                widget: "#SmallInfoCard",
                                label: "openedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "openedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "closedBy",
                                widget: "#SmallInfoCard",
                                label: "closedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "closedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "openedAt",
                                widget: "#SmallInfoCard",
                                label: "openedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "closedAt",
                                widget: "#SmallInfoCard",
                                label: "closedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "company",
                                widget: "#SmallInfoCard",
                                label: "company",
                                widgetProps: {
                                    icon: "#IconBuilding",
                                    parent: "company",
                                    valuePath: ["name"],
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "updatedAt",
                                widget: "#SmallInfoCard",
                                label: "updatedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "openingBalance",
                                widget: "#SmallInfoCard",
                                label: "openingBalance",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "closingBalance",
                                widget: "#SmallInfoCard",
                                label: "closingBalance",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "expectedCash",
                                widget: "#SmallInfoCard",
                                label: "expectedCash",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "cashRegisterBalance",
                                widget: "#SmallInfoCard",
                                label: "cashRegisterBalance",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "orderCount",
                                widget: "#SmallInfoCard",
                                label: "orderCount",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "totalSales",
                                widget: "#SmallInfoCard",
                                label: "totalSales",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "totalCash",
                                widget: "#SmallInfoCard",
                                label: "totalCash",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "totalCard",
                                widget: "#SmallInfoCard",
                                label: "totalCard",
                                widgetProps: {icon: "#IconCreditCard", format: "locale"},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "notes",
                                widget: "#SmallInfoCard",
                                label: "notes",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const posSessionCreateFormView: ViewConfig = {
    model: "posSessions",
    viewType: "form",
    viewMode: "create",
    accessModel: "posSessions",
    apiUrl: "/api/eCommerce/posSession",
    method: "PUT",
    nodes: posSessionCreateFormFields,
};

export const posSessionEditFormView: ViewConfig = {
    model: "posSessions",
    viewType: "form",
    viewMode: "edit",
    accessModel: "posSessions",
    apiUrl: "/api/eCommerce/posSession",
    method: "PATCH",
    nodes: posSessionEditFormFields,
};

export const posSessionViews: ViewConfig[] = [posSessionSheetView, posSessionCreateFormView, posSessionEditFormView];
