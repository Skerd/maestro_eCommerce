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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "state", widget: "#SmallInfoCard", label: "state", widgetProps: {icon: "#Tag", languageKeyCategory: "posSessionState"}}},
                        {render: "#SmallInfoCard", field: {name: "openingBalance", widget: "#SmallInfoCard", label: "openingBalance", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "closingBalance", widget: "#SmallInfoCard", label: "closingBalance", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "expectedCash", widget: "#SmallInfoCard", label: "expectedCash", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "cashRegisterBalance", widget: "#SmallInfoCard", label: "cashRegisterBalance", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "orderCount", widget: "#SmallInfoCard", label: "orderCount", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "totalSales", widget: "#SmallInfoCard", label: "totalSales", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "totalCash", widget: "#SmallInfoCard", label: "totalCash", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "totalCard", widget: "#SmallInfoCard", label: "totalCard", widgetProps: {icon: "#IconCreditCard"}}},
                        {render: "#SmallInfoCard", field: {name: "openedAt", widget: "#SmallInfoCard", label: "openedAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", field: {name: "closedAt", widget: "#SmallInfoCard", label: "closedAt", widgetProps: {icon: "#Calendar"}}},
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
