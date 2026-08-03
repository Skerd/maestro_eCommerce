import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const posPaymentMethodTypeOptions = [
    {value: "cash", label: "form.paymentType.cash"},
    {value: "card", label: "form.paymentType.card"},
    {value: "bank", label: "form.paymentType.bank"},
    {value: "customer_account", label: "form.paymentType.customer_account"},
    {value: "other", label: "form.paymentType.other"},
];

const posTerminalProviderOptions = [
    {value: "manual", label: "form.terminalProvider.manual"},
    {value: "local_http", label: "form.terminalProvider.local_http"},
];

const posTerminalProtocolOptions = [
    {value: "http", label: "form.terminalProtocol.http"},
    {value: "https", label: "form.terminalProtocol.https"},
];

const posPaymentMethodFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 3},
        children: [
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "type",
                    widget: "#Select",
                    label: "form.typeLabel",
                    required: true,
                    widgetProps: {options: posPaymentMethodTypeOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "sequence",
                    widget: "#Input",
                    label: "form.sequenceLabel",
                    placeholder: "form.sequencePlaceholder",
                    widgetProps: {type: "number", min: 0},
                },
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "type", whenValues: ["cash"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "cashQuickAmounts",
                            widget: "#Input",
                            label: "form.cashQuickAmountsLabel",
                            placeholder: "form.cashQuickAmountsPlaceholder",
                            widgetProps: {className: "grow w-full"},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {
            title: "form.terminalSectionTitle",
            defaultOpen: true,
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "terminalEnabled",
                            widget: "#Switch",
                            label: "form.terminalEnabledLabel",
                        },
                    },
                ],
            },
            // Sync type when the terminal switch toggles (create + edit).
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "terminalEnabled",
                    whenValues: ["true"],
                    setFieldsOnMatch: {type: "card"},
                },
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "terminalEnabled",
                    whenValues: ["false"],
                    setFieldsOnMatch: {type: "cash"},
                },
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {watchField: "terminalEnabled", whenValues: ["true"]},
                children: [
                    {
                        render: "#FormAlert",
                        props: {
                            message: "form.terminalForcesCardHint",
                        },
                    },
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalProvider",
                                    widget: "#Select",
                                    label: "form.terminalProviderLabel",
                                    widgetProps: {options: posTerminalProviderOptions, className: "grow w-full"},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalId",
                                    widget: "#Input",
                                    label: "form.terminalIdLabel",
                                    placeholder: "form.terminalIdPlaceholder",
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalProtocol",
                                    widget: "#Select",
                                    label: "form.terminalProtocolLabel",
                                    widgetProps: {options: posTerminalProtocolOptions, className: "grow w-full"},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalHost",
                                    widget: "#Input",
                                    label: "form.terminalHostLabel",
                                    placeholder: "form.terminalHostPlaceholder",
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalPort",
                                    widget: "#Input",
                                    label: "form.terminalPortLabel",
                                    placeholder: "form.terminalPortPlaceholder",
                                    widgetProps: {type: "number", min: 1, max: 65535},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalPath",
                                    widget: "#Input",
                                    label: "form.terminalPathLabel",
                                    placeholder: "form.terminalPathPlaceholder",
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

export const posPaymentMethodSheetView: ViewConfig = {
    model: "posPaymentMethods",
    viewType: "sheet",
    accessModel: "posPaymentMethods",
    apiUrl: "/api/eCommerce/posPaymentMethod",
    header: {titleField: "name", subtitleKey: "posPaymentMethodSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "paymentType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "sequence"}, field: {name: "sequence", widget: "#SmallInfoCard", label: "sequence", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "cashQuickAmounts"}, field: {name: "cashQuickAmounts", widget: "#SmallInfoCard", label: "cashQuickAmounts", widgetProps: {icon: "#IconCash"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "terminal"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "terminalEnabled"}, field: {name: "terminalEnabled", widget: "#SmallInfoCard", label: "terminalEnabled", widgetProps: {icon: "#IconCreditCard", valueType: "boolean"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "terminalProvider"},
                            dependent: "terminalEnabled",
                            field: {
                                name: "terminalProvider",
                                widget: "#SmallInfoCard",
                                label: "terminalProviderLabel",
                                widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "terminalProvider"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "terminalProtocol"},
                            dependent: "terminalEnabled",
                            field: {
                                name: "terminalProtocol",
                                widget: "#SmallInfoCard",
                                label: "terminalProtocolLabel",
                                widgetProps: {icon: "#IconTag", languageKeyCategory: "terminalProtocol"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "terminalHost"},
                            dependent: "terminalEnabled",
                            field: {name: "terminalHost", widget: "#SmallInfoCard", label: "terminalHost", widgetProps: {icon: "#IconTag"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "terminalPort"},
                            dependent: "terminalEnabled",
                            field: {name: "terminalPort", widget: "#SmallInfoCard", label: "terminalPort", widgetProps: {icon: "#Hash"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "terminalId"},
                            dependent: "terminalEnabled",
                            field: {name: "terminalId", widget: "#SmallInfoCard", label: "terminalId", widgetProps: {icon: "#IconTag"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "terminalPath"},
                            dependent: "terminalEnabled",
                            field: {name: "terminalPath", widget: "#SmallInfoCard", label: "terminalPath", widgetProps: {icon: "#IconTag"}},
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "lifecycle", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdAt"},
                            field: {
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "updatedAt"},
                            field: {
                                name: "updatedAt",
                                widget: "#SmallInfoCard",
                                label: "updatedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdBy"},
                            field: {
                                name: "createdBy",
                                widget: "#SmallInfoCard",
                                label: "createdBy",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "createdBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            dependent: "deletedAt",
                            permissions: {read: "deletedAt"},
                            field: {
                                name: "deletedAt",
                                widget: "#SmallInfoCard",
                                label: "deletedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            dependent: "deletedBy",
                            permissions: {read: "deletedBy"},
                            field: {
                                name: "deletedBy",
                                widget: "#SmallInfoCard",
                                label: "deletedBy",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "deletedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const posPaymentMethodCreateFormView: ViewConfig = {
    model: "posPaymentMethods",
    viewType: "form",
    viewMode: "create",
    accessModel: "posPaymentMethods",
    apiUrl: "/api/eCommerce/posPaymentMethod",
    method: "PUT",
    nodes: posPaymentMethodFormFields,
};

export const posPaymentMethodEditFormView: ViewConfig = {
    model: "posPaymentMethods",
    viewType: "form",
    viewMode: "edit",
    accessModel: "posPaymentMethods",
    apiUrl: "/api/eCommerce/posPaymentMethod",
    method: "PATCH",
    nodes: posPaymentMethodFormFields,
};

export const posPaymentMethodViews: ViewConfig[] = [
    posPaymentMethodSheetView,
    posPaymentMethodCreateFormView,
    posPaymentMethodEditFormView,
];
