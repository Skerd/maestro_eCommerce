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

const posPaymentMethodFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
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
            {render: "#Field", field: {name: "sequence", widget: "#Input", label: "form.sequenceLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
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
            {render: "#Field", field: {name: "terminalEnabled", widget: "#Checkbox", label: "form.terminalEnabledLabel"}},
            {
                render: "#Field",
                field: {
                    name: "terminalProvider",
                    widget: "#Select",
                    label: "form.terminalProviderLabel",
                    widgetProps: {options: posTerminalProviderOptions, className: "grow w-full"},
                },
            },
            {render: "#Field", field: {name: "terminalHost", widget: "#Input", label: "form.terminalHostLabel", placeholder: "form.terminalHostPlaceholder"}},
            {
                render: "#Field",
                field: {
                    name: "terminalPort",
                    widget: "#Input",
                    label: "form.terminalPortLabel",
                    widgetProps: {type: "number", min: 1, max: 65535},
                },
            },
            {render: "#Field", field: {name: "terminalId", widget: "#Input", label: "form.terminalIdLabel", placeholder: "form.terminalIdPlaceholder"}},
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
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "cashQuickAmounts"}, field: {name: "cashQuickAmounts", widget: "#SmallInfoCard", label: "cashQuickAmounts", widgetProps: {icon: "#IconCash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "terminalEnabled"}, field: {name: "terminalEnabled", widget: "#SmallInfoCard", label: "terminalEnabled", widgetProps: {icon: "#IconCreditCard"}}},
                        {render: "#SmallInfoCard", permissions: {read: "terminalProvider"}, field: {name: "terminalProvider", widget: "#SmallInfoCard", label: "terminalProviderLabel", widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "terminalProvider"}}},
                        {render: "#SmallInfoCard", permissions: {read: "terminalHost"}, field: {name: "terminalHost", widget: "#SmallInfoCard", label: "terminalHost", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "terminalPort"}, field: {name: "terminalPort", widget: "#SmallInfoCard", label: "terminalPort", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "terminalId"}, field: {name: "terminalId", widget: "#SmallInfoCard", label: "terminalId", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "terminalPath"}, field: {name: "terminalPath", widget: "#SmallInfoCard", label: "terminalPath", widgetProps: {icon: "#IconTag"}}},
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
