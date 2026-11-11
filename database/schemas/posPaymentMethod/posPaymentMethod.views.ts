import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    POS_PAYMENT_METHOD_CASH_QUICK_AMOUNTS_MAX,
    POS_PAYMENT_METHOD_NAME_MAX,
    POS_PAYMENT_METHOD_TERMINAL_HOST_MAX,
    POS_PAYMENT_METHOD_TERMINAL_ID_MAX,
    POS_PAYMENT_METHOD_TERMINAL_PATH_MAX,
    posPaymentMethodTypes,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";


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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#DisplayCard",
                                label: "type",
                                widgetProps: {
                                    icon: "#IconCreditCard",
                                    languageKeyCategory: "paymentType",
                                    type: "enum"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "cashQuickAmounts",
                            permissions: {read: "cashQuickAmounts"},
                            field: {
                                name: "cashQuickAmounts",
                                widget: "#DisplayCard",
                                label: "cashQuickAmounts",
                                widgetProps: {icon: "#IconCash"}
                            }
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "terminal"},
            // Only card methods drive a terminal (UX-10).
            dependent: "terminalEnabled",
            permissions: {read: "terminalEnabled"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "terminalProvider",
                            permissions: {read: "terminalProvider"},
                            field: {
                                name: "terminalProvider",
                                widget: "#DisplayCard",
                                label: "terminalProviderLabel",
                                widgetProps: {
                                    icon: "#IconCreditCard",
                                    languageKeyCategory: "terminalProvider",
                                    type: "enum"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "terminalProtocol",
                            permissions: {read: "terminalProtocol"},
                            field: {
                                name: "terminalProtocol",
                                widget: "#DisplayCard",
                                label: "terminalProtocolLabel",
                                widgetProps: {
                                    icon: "#IconTag",
                                    languageKeyCategory: "terminalProtocol",
                                    type: "enum"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "terminalHost",
                            permissions: {read: "terminalHost"},
                            field: {
                                name: "terminalHost",
                                widget: "#DisplayCard",
                                label: "terminalHost",
                                widgetProps: {icon: "#IconTag"}
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "terminalPort",
                            permissions: {read: "terminalPort"},
                            field: {
                                name: "terminalPort",
                                widget: "#DisplayCard",
                                label: "terminalPort",
                                widgetProps: {icon: "#Hash"}
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "terminalId",
                            permissions: {read: "terminalId"},
                            field: {
                                name: "terminalId",
                                widget: "#DisplayCard",
                                label: "terminalId",
                                widgetProps: {icon: "#IconTag"}
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "terminalPath",
                            permissions: {read: "terminalPath"},
                            field: {
                                name: "terminalPath",
                                widget: "#DisplayCard",
                                label: "terminalPath",
                                widgetProps: {icon: "#IconTag"}
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const posPaymentMethodCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.basicsSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "name",
                            widget: "#Input",
                            label: "form.nameLabel",
                            placeholder: "form.namePlaceholder",
                            required: true,
                            widgetProps: {maxLength: POS_PAYMENT_METHOD_NAME_MAX},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            placeholder: "form.typePlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "cash", label: "form.paymentType.cash"},
                                    {value: "card", label: "form.paymentType.card"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "type", whenValues: ["cash"]},
        children: [
            {
                render: "#TitleWithCollapse",
                props: {title: "form.cashSectionTitle", defaultOpen: true},
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
                                    widgetProps: {
                                        className: "grow w-full",
                                        maxLength: POS_PAYMENT_METHOD_CASH_QUICK_AMOUNTS_MAX,
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
        render: "#FormWhenFieldValueIn",
        props: {watchField: "type", whenValues: ["card"]},
        children: [
            {
                render: "#TitleWithCollapse",
                props: {
                    title: "form.terminalSectionTitle",
                    defaultOpen: true,
                },
                children: [
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
                                    placeholder: "form.terminalProviderPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        options: [
                                            {value: "manual", label: "form.terminalProvider.manual"},
                                            {value: "local_http", label: "form.terminalProvider.local_http"},
                                        ],
                                        className: "grow w-full"
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalId",
                                    widget: "#Input",
                                    label: "form.terminalIdLabel",
                                    placeholder: "form.terminalIdPlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: POS_PAYMENT_METHOD_TERMINAL_ID_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalProtocol",
                                    widget: "#Select",
                                    label: "form.terminalProtocolLabel",
                                    placeholder: "form.terminalProtocolPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        options: [
                                            {value: "http", label: "form.terminalProtocol.http"},
                                            {value: "https", label: "form.terminalProtocol.https"},
                                        ],
                                        className: "grow w-full"
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalHost",
                                    widget: "#Input",
                                    label: "form.terminalHostLabel",
                                    placeholder: "form.terminalHostPlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: POS_PAYMENT_METHOD_TERMINAL_HOST_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalPort",
                                    widget: "#Input",
                                    label: "form.terminalPortLabel",
                                    placeholder: "form.terminalPortPlaceholder",
                                    required: true,
                                    widgetProps: {type: "number", min: 1, max: 65535, step: 1},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "terminalPath",
                                    widget: "#Input",
                                    label: "form.terminalPathLabel",
                                    placeholder: "form.terminalPathPlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: POS_PAYMENT_METHOD_TERMINAL_PATH_MAX},
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "sequence",
                            widget: "#Input",
                            label: "form.sequenceLabel",
                            placeholder: "form.sequencePlaceholder",
                            widgetProps: {type: "number", min: 0, step: 1},
                        },
                    },
                ],
            },
        ],
    },
];

const posPaymentMethodEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.basicsSectionTitle", defaultOpen: true},
        permissions: {readAny: ["name", "type"], writeAny: ["name", "type"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "name", write: "name"},
                        field: {
                            name: "name",
                            widget: "#Input",
                            label: "form.nameLabel",
                            placeholder: "form.namePlaceholder",
                            required: true,
                            widgetProps: {maxLength: POS_PAYMENT_METHOD_NAME_MAX},
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "type", write: "type"},
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            placeholder: "form.typePlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "cash", label: "form.paymentType.cash"},
                                    {value: "card", label: "form.paymentType.card"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        permissions: {readAny: ["cashQuickAmounts"], writeAny: ["cashQuickAmounts"]},
        props: {watchField: "type", whenValues: ["cash"]},
        children: [
            {
                render: "#TitleWithCollapse",
                props: {title: "form.cashSectionTitle", defaultOpen: true},
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 1},
                        children: [
                            {
                                render: "#Field",
                                permissions: {read: "cashQuickAmounts", write: "cashQuickAmounts"},
                                field: {
                                    name: "cashQuickAmounts",
                                    widget: "#Input",
                                    label: "form.cashQuickAmountsLabel",
                                    placeholder: "form.cashQuickAmountsPlaceholder",
                                    widgetProps: {
                                        className: "grow w-full",
                                        maxLength: POS_PAYMENT_METHOD_CASH_QUICK_AMOUNTS_MAX,
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
        render: "#FormWhenFieldValueIn",
        permissions: {
            readAny: [
                "terminalProvider",
                "terminalId",
                "terminalProtocol",
                "terminalHost",
                "terminalPort",
                "terminalPath",
            ],
            writeAny: [
                "terminalProvider",
                "terminalId",
                "terminalProtocol",
                "terminalHost",
                "terminalPort",
                "terminalPath",
            ],
        },
        props: {watchField: "type", whenValues: ["card"]},
        children: [
            {
                render: "#TitleWithCollapse",
                props: {
                    title: "form.terminalSectionTitle",
                    defaultOpen: true,
                },
                permissions: {
                    writeAny: [
                        "terminalProvider",
                        "terminalId",
                        "terminalProtocol",
                        "terminalHost",
                        "terminalPort",
                        "terminalPath",
                    ],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                permissions: {read: "terminalProvider", write: "terminalProvider"},
                                field: {
                                    name: "terminalProvider",
                                    widget: "#Select",
                                    label: "form.terminalProviderLabel",
                                    placeholder: "form.terminalProviderPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        options: [
                                            {value: "manual", label: "form.terminalProvider.manual"},
                                            {value: "local_http", label: "form.terminalProvider.local_http"},
                                        ],
                                        className: "grow w-full"
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "terminalId", write: "terminalId"},
                                field: {
                                    name: "terminalId",
                                    widget: "#Input",
                                    label: "form.terminalIdLabel",
                                    placeholder: "form.terminalIdPlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: POS_PAYMENT_METHOD_TERMINAL_ID_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "terminalProtocol", write: "terminalProtocol"},
                                field: {
                                    name: "terminalProtocol",
                                    widget: "#Select",
                                    label: "form.terminalProtocolLabel",
                                    placeholder: "form.terminalProtocolPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        options: [
                                            {value: "http", label: "form.terminalProtocol.http"},
                                            {value: "https", label: "form.terminalProtocol.https"},
                                        ],
                                        className: "grow w-full"
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "terminalHost", write: "terminalHost"},
                                field: {
                                    name: "terminalHost",
                                    widget: "#Input",
                                    label: "form.terminalHostLabel",
                                    placeholder: "form.terminalHostPlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: POS_PAYMENT_METHOD_TERMINAL_HOST_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "terminalPort", write: "terminalPort"},
                                field: {
                                    name: "terminalPort",
                                    widget: "#Input",
                                    label: "form.terminalPortLabel",
                                    placeholder: "form.terminalPortPlaceholder",
                                    required: true,
                                    widgetProps: {type: "number", min: 1, max: 65535, step: 1},
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "terminalPath", write: "terminalPath"},
                                field: {
                                    name: "terminalPath",
                                    widget: "#Input",
                                    label: "form.terminalPathLabel",
                                    placeholder: "form.terminalPathPlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: POS_PAYMENT_METHOD_TERMINAL_PATH_MAX},
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle", defaultOpen: true},
        permissions: {readAny: ["sequence"], writeAny: ["sequence"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "sequence", write: "sequence"},
                        field: {
                            name: "sequence",
                            widget: "#Input",
                            label: "form.sequenceLabel",
                            placeholder: "form.sequencePlaceholder",
                            widgetProps: {type: "number", min: 0, step: 1},
                        },
                    },
                ],
            },
        ],
    },
];

export const posPaymentMethodCreateFormView: ViewConfig = {
    model: "posPaymentMethods",
    viewType: "form",
    viewMode: "create",
    accessModel: "posPaymentMethods",
    apiUrl: "/api/eCommerce/posPaymentMethod",
    method: "PUT",
    nodes: posPaymentMethodCreateFormNodes,
};

export const posPaymentMethodEditFormView: ViewConfig = {
    model: "posPaymentMethods",
    viewType: "form",
    viewMode: "edit",
    accessModel: "posPaymentMethods",
    apiUrl: "/api/eCommerce/posPaymentMethod",
    method: "PATCH",
    nodes: posPaymentMethodEditFormNodes,
};

export const posPaymentMethodViews: ViewConfig[] = [
    posPaymentMethodSheetView,
    posPaymentMethodCreateFormView,
    posPaymentMethodEditFormView,
];
