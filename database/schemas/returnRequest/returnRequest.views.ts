import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {
    RETURN_REQUEST_NOTE_MAX,
    RETURN_REQUEST_REASON_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.schema-def";

const returnRequestTypeOptions = [
    {value: "return", label: "form.returnType.return"},
    {value: "exchange", label: "form.returnType.exchange"},
    {value: "refund", label: "form.returnType.refund"},
];

const textareaScrollClass = "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto";
const reasonTextareaScrollClass = "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto";

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
                    widget: "#SimpleSelect",
                    label: "form.typeLabel",
                    required: true,
                    widgetProps: {options: returnRequestTypeOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "refundAmount",
                    widget: "#Input",
                    label: "form.refundAmountLabel",
                    placeholder: "form.refundAmountPlaceholder",
                    widgetProps: {type: "number", min: 0},
                },
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "customerNote",
            widget: "#Textarea",
            label: "form.customerNoteLabel",
            placeholder: "form.customerNotePlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: RETURN_REQUEST_NOTE_MAX},
        },
    },
    {
        render: "#Field",
        field: {
            name: "adminNote",
            widget: "#Textarea",
            label: "form.adminNoteLabel",
            placeholder: "form.adminNotePlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: RETURN_REQUEST_NOTE_MAX},
        },
    },
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
                            {
                                render: "#Field",
                                field: {
                                    name: "orderItemId",
                                    widget: "#Input",
                                    label: "form.orderItemIdLabel",
                                    placeholder: "form.orderItemIdPlaceholder",
                                    required: true,
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "quantity",
                                    widget: "#Input",
                                    label: "form.quantityLabel",
                                    required: true,
                                    widgetProps: {type: "number", min: 1},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "reason",
                                    widget: "#Textarea",
                                    label: "form.reasonLabel",
                                    placeholder: "form.reasonPlaceholder",
                                    required: true,
                                    widgetProps: {rows: 3, className: reasonTextareaScrollClass, maxLength: RETURN_REQUEST_REASON_MAX},
                                },
                            },
                        ],
                    },
                ],
            },
        },
    },
];

const returnRequestEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        permissions: {writeAny: ["order", "type", "refundAmount"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "order", write: "order"},
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
                permissions: {read: "type", write: "type"},
                field: {
                    name: "type",
                    widget: "#SimpleSelect",
                    label: "form.typeLabel",
                    required: true,
                    widgetProps: {options: returnRequestTypeOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                permissions: {read: "refundAmount", write: "refundAmount"},
                field: {
                    name: "refundAmount",
                    widget: "#Input",
                    label: "form.refundAmountLabel",
                    placeholder: "form.refundAmountPlaceholder",
                    widgetProps: {type: "number", min: 0},
                },
            },
        ],
    },
    {
        render: "#Field",
        permissions: {read: "customerNote", write: "customerNote"},
        field: {
            name: "customerNote",
            widget: "#Textarea",
            label: "form.customerNoteLabel",
            placeholder: "form.customerNotePlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: RETURN_REQUEST_NOTE_MAX},
        },
    },
    {
        render: "#Field",
        permissions: {read: "adminNote", write: "adminNote"},
        field: {
            name: "adminNote",
            widget: "#Textarea",
            label: "form.adminNoteLabel",
            placeholder: "form.adminNotePlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: RETURN_REQUEST_NOTE_MAX},
        },
    },
    {
        render: "#Field",
        permissions: {read: "items", write: "items"},
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
                            {
                                render: "#Field",
                                permissions: {read: "items", write: "items"},
                                field: {
                                    name: "orderItemId",
                                    widget: "#Input",
                                    label: "form.orderItemIdLabel",
                                    placeholder: "form.orderItemIdPlaceholder",
                                    required: true,
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "items", write: "items"},
                                field: {
                                    name: "quantity",
                                    widget: "#Input",
                                    label: "form.quantityLabel",
                                    required: true,
                                    widgetProps: {type: "number", min: 1},
                                },
                            },
                            {
                                render: "#Field",
                                permissions: {read: "items", write: "items"},
                                field: {
                                    name: "reason",
                                    widget: "#Textarea",
                                    label: "form.reasonLabel",
                                    placeholder: "form.reasonPlaceholder",
                                    required: true,
                                    widgetProps: {rows: 3, className: reasonTextareaScrollClass, maxLength: RETURN_REQUEST_REASON_MAX},
                                },
                            },
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
            props: {title: "overview", defaultOpen: true},
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
                                widgetProps: {icon: "#IconRefresh", languageKeyCategory: "returnType", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "returnStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "refundAmount"},
                            field: {
                                name: "refundAmount",
                                widget: "#DisplayCard",
                                label: "refundAmount",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "resolvedAt"},
                            field: {
                                name: "resolvedAt",
                                widget: "#DisplayCard",
                                label: "resolvedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "notes", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "customerNote"},
                            field: {
                                name: "customerNote",
                                widget: "#DisplayCard",
                                label: "customerNote",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "adminNote"},
                            field: {
                                name: "adminNote",
                                widget: "#DisplayCard",
                                label: "adminNote",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "related", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#DisplayCard",
                                label: "order",
                                widgetProps: {
                                    icon: "#IconShoppingCart",
                                    parent: "order",
                                    valuePath: ["orderNumber"],
                                    linkedRefPath: "order",
                                    linkedSheetModel: "productOrders",
                                    linkedSheetWidget: "#ProductOrderSheetView",
                                    linkedSheetEntityProp: "order",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "resolvedBy"},
                            field: {
                                name: "resolvedBy",
                                widget: "#DisplayCard",
                                label: "resolvedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "resolvedBy",
                                    valuePath: ["name"],
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "company"},
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
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "returnRequest.sheet.items.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "items",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "items",
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "items",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["orderItemId", "quantity", "reason"],
                                            fields: [
                                                {
                                                    name: "orderItemId",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemOrderItemId",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantity",
                                                },
                                                {
                                                    name: "reason",
                                                    type: "text",
                                                    className: "text-sm whitespace-pre-wrap",
                                                    labelKey: "itemReason",
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
        lifecycleSheetGroup,
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
    nodes: returnRequestEditFormNodes,
};

export const returnRequestViews: ViewConfig[] = [returnRequestSheetView, returnRequestCreateFormView, returnRequestEditFormView];
