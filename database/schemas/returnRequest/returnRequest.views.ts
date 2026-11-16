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

// Task order: which order and what is asked, then the lines coming back, then the notes (UX-04).
const returnRequestCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.requestSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
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
                            placeholder: "form.typePlaceholder",
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
                            description: "form.orderAmountDescription",
                            widgetProps: {type: "number", min: 0, step: "any"},
                        },
                    },
                ],
            },
        ],
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
                                    widget: "#ApiSelect",
                                    label: "form.orderItemIdLabel",
                                    placeholder: "form.orderItemIdPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/productOrder/lineSelect",
                                        normalizeEmptyToUndefined: true,
                                        postBodyFromFormField: {field: "order", paramName: "productOrderId"},
                                        remountKeyFormField: "order",
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "quantity",
                                    widget: "#Input",
                                    label: "form.quantityLabel",
                                    required: true,
                                    widgetProps: {type: "number", min: 1, step: 1},
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
    {
        render: "#TitleWithCollapse",
        props: {title: "form.notesSectionTitle", defaultOpen: false},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
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
                ],
            },
        ],
    },
];

const returnRequestEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.requestSectionTitle", defaultOpen: true},
        permissions: {readAny: ["order", "type", "refundAmount"], writeAny: ["order", "type", "refundAmount"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
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
                            placeholder: "form.typePlaceholder",
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
                            description: "form.orderAmountDescription",
                            widgetProps: {type: "number", min: 0, step: "any"},
                        },
                    },
                ],
            },
        ],
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
                                    widget: "#ApiSelect",
                                    label: "form.orderItemIdLabel",
                                    placeholder: "form.orderItemIdPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/productOrder/lineSelect",
                                        normalizeEmptyToUndefined: true,
                                        postBodyFromFormField: {field: "order", paramName: "productOrderId"},
                                        remountKeyFormField: "order",
                                    },
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
                                    widgetProps: {type: "number", min: 1, step: 1},
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
    {
        render: "#TitleWithCollapse",
        props: {title: "form.notesSectionTitle", defaultOpen: true},
        permissions: {readAny: ["customerNote", "adminNote"], writeAny: ["customerNote", "adminNote"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
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
                ],
            },
        ],
    },
];

export const returnRequestSheetView: ViewConfig = {
    model: "returnRequests",
    viewType: "sheet",
    sheetWidget: "#ReturnRequestSheetView",
    accessModel: "returnRequests",
    apiUrl: "/api/eCommerce/returnRequest",
    header: {titleField: "type", subtitleKey: "returnRequestSubtitle", showCloseButton: true},
    nodes: [
        // Type and order are the title, the status is the header badge (UX-01/02).
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
                            dependent: "refundAmount",
                            permissions: {read: "refundAmount"},
                            field: {
                                name: "refundAmount",
                                widget: "#DisplayCard",
                                label: "refundAmount",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["order.currency.symbol", "refundAmount"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "order.currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "order.currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "resolvedAt",
                            permissions: {read: "resolvedAt"},
                            field: {
                                name: "resolvedAt",
                                widget: "#DisplayCard",
                                label: "resolvedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "resolvedBy",
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
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            dependent: "items",
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
                                            entityCards: true,
                                            columns: 2,
                                            compactSummaryFields: ["snapshot", "quantity", "reason"],
                                            fields: [
                                                {
                                                    // The name and options as sold; the product link below opens today's product.
                                                    name: "snapshot",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "variantLabel"],
                                                    joinSeparator: " · ",
                                                    icon: "#IconTag",
                                                },
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm",
                                                    valuePath: ["title", "sku"],
                                                    joinSeparator: " · ",
                                                    labelKey: "itemProduct",
                                                    linkedSheetModel: "products",
                                                    linkedSheetWidget: "#ProductSheetView",
                                                    linkedSheetEntityProp: "product",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantity",
                                                    icon: "#Hash",
                                                },
                                                {
                                                    name: "reason",
                                                    type: "text",
                                                    className: "text-sm whitespace-pre-wrap",
                                                    labelKey: "itemReason",
                                                    icon: "#IconNote",
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
            dependentAny: ["customerNote", "adminNote"],
            props: {title: "notes", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "customerNote",
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
                            dependent: "adminNote",
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
    nodes: returnRequestCreateFormNodes,
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
