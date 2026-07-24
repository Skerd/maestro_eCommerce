import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const returnRequestTypeOptions = [
    {value: "return", label: "form.returnType.return"},
    {value: "exchange", label: "form.returnType.exchange"},
    {value: "refund", label: "form.returnType.refund"},
];

const returnRequestStatusOptions = [
    {value: "pending", label: "form.returnStatus.pending"},
    {value: "approved", label: "form.returnStatus.approved"},
    {value: "rejected", label: "form.returnStatus.rejected"},
    {value: "received", label: "form.returnStatus.received"},
    {value: "completed", label: "form.returnStatus.completed"},
];

const returnRequestFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "order",
                    widget: "#ApiSelect",
                    label: "form.orderLabel",
                    placeholder: "form.orderPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerce/productOrder/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "type",
                    widget: "#Select",
                    label: "form.typeLabel",
                    required: true,
                    widgetProps: {options: returnRequestTypeOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "status",
                    widget: "#Select",
                    label: "form.statusLabel",
                    widgetProps: {options: returnRequestStatusOptions, className: "grow w-full"},
                },
            },
            {render: "#Field", field: {name: "refundAmount", widget: "#Input", label: "form.refundAmountLabel", widgetProps: {type: "number", min: 0}}},
        ],
    },
    {render: "#Field", field: {name: "customerNote", widget: "#Textarea", label: "form.customerNoteLabel"}},
    {render: "#Field", field: {name: "adminNote", widget: "#Textarea", label: "form.adminNoteLabel"}},
    {
        render: "#Field",
        field: {
            name: "items",
            widget: "#FormRepeater",
            widgetProps: {
                title: "form.itemsSectionTitle",
                arrayField: "items",
                defaultItem: {orderItemId: "", quantity: 1, reason: ""},
                addLabel: "form.itemAddRow",
                removeLabel: "form.itemRemoveRow",
                rowTitleFields: ["reason"],
                rowTitlePlaceholder: "form.itemRowTitle",
                rowTemplate: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {render: "#Field", field: {name: "orderItemId", widget: "#Input", label: "form.orderItemIdLabel", required: true}},
                            {render: "#Field", field: {name: "quantity", widget: "#Input", label: "form.quantityLabel", required: true, widgetProps: {type: "number", min: 1}}},
                            {render: "#Field", field: {name: "reason", widget: "#Input", label: "form.reasonLabel", required: true}},
                        ],
                    },
                ],
            },
        },
    },
];

export const returnRequestSheetView: ViewConfig = {
    model: "returnRequests",
    viewType: "sheet",
    accessModel: "returnRequests",
    apiUrl: "/api/eCommerce/returnRequest",
    header: {titleField: "type", subtitleKey: "returnRequestSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconRefresh", languageKeyCategory: "returnType"}}},
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "returnStatus"}}},
                        {render: "#SmallInfoCard", field: {name: "refundAmount", widget: "#SmallInfoCard", label: "refundAmount", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "customerNote", widget: "#SmallInfoCard", label: "customerNote", widgetProps: {icon: "#IconNote"}}},
                        {render: "#SmallInfoCard", field: {name: "adminNote", widget: "#SmallInfoCard", label: "adminNote", widgetProps: {icon: "#IconNote"}}},
                    ],
                },
            ],
        },
    ],
};

export const returnRequestCreateFormView: ViewConfig = {
    model: "returnRequests",
    viewType: "form",
    viewMode: "create",
    accessModel: "returnRequests",
    apiUrl: "/api/eCommerce/returnRequest",
    method: "PUT",
    nodes: returnRequestFormFields,
};

export const returnRequestEditFormView: ViewConfig = {
    model: "returnRequests",
    viewType: "form",
    viewMode: "edit",
    accessModel: "returnRequests",
    apiUrl: "/api/eCommerce/returnRequest",
    method: "PATCH",
    nodes: returnRequestFormFields,
};

export const returnRequestViews: ViewConfig[] = [returnRequestSheetView, returnRequestCreateFormView, returnRequestEditFormView];
