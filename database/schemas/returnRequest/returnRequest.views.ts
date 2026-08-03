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
            widgetProps: {rows: 4, className: textareaScrollClass},
        },
    },
    {
        render: "#Field",
        field: {
            name: "adminNote",
            widget: "#Textarea",
            label: "form.adminNoteLabel",
            placeholder: "form.adminNotePlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass},
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
                                    widgetProps: {rows: 3, className: reasonTextareaScrollClass},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "type",
                                widget: "#SmallInfoCard",
                                label: "type",
                                widgetProps: {icon: "#IconRefresh", languageKeyCategory: "returnType"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "status",
                                widget: "#SmallInfoCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "returnStatus"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "refundAmount",
                                widget: "#SmallInfoCard",
                                label: "refundAmount",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "resolvedAt",
                                widget: "#SmallInfoCard",
                                label: "resolvedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "customerNote",
                                widget: "#SmallInfoCard",
                                label: "customerNote",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "adminNote",
                                widget: "#SmallInfoCard",
                                label: "adminNote",
                                widgetProps: {icon: "#IconNote"},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "order",
                                widget: "#SmallInfoCard",
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "resolvedBy",
                                widget: "#SmallInfoCard",
                                label: "resolvedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "resolvedBy",
                                    valuePath: ["name"],
                                },
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
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
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
