import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const fulfillmentStatusOptions = [
    {value: "pending", label: "form.fulfillmentStatus.pending"},
    {value: "shipped", label: "form.fulfillmentStatus.shipped"},
    {value: "delivered", label: "form.fulfillmentStatus.delivered"},
    {value: "failed", label: "form.fulfillmentStatus.failed"},
];

const textareaScrollClass = "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto";

const fulfillmentFormFields: ViewConfig["nodes"] = [
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
                    name: "status",
                    widget: "#Select",
                    label: "form.statusLabel",
                    widgetProps: {options: fulfillmentStatusOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "carrier",
                    widget: "#Input",
                    label: "form.carrierLabel",
                    placeholder: "form.carrierPlaceholder",
                },
            },
            {
                render: "#Field",
                field: {
                    name: "trackingNumber",
                    widget: "#Input",
                    label: "form.trackingNumberLabel",
                    placeholder: "form.trackingNumberPlaceholder",
                },
            },
            {
                render: "#Field",
                field: {
                    name: "trackingUrl",
                    widget: "#Input",
                    label: "form.trackingUrlLabel",
                    placeholder: "form.trackingUrlPlaceholder",
                },
            },
            {
                render: "#Field",
                field: {
                    name: "shippedAt",
                    widget: "#DateInput",
                    label: "form.shippedAtLabel",
                    widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "estimatedDeliveryAt",
                    widget: "#DateInput",
                    label: "form.estimatedDeliveryAtLabel",
                    widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "deliveredAt",
                    widget: "#DateInput",
                    label: "form.deliveredAtLabel",
                    widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                },
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "notes",
            widget: "#Textarea",
            label: "form.notesLabel",
            placeholder: "form.notesPlaceholder",
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
                defaultItem: {orderItemId: "", quantity: 1},
                addLabel: "form.itemAddRow",
                removeLabel: "form.itemRemoveRow",
                rowTitleFields: ["orderItemId"],
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
                        ],
                    },
                ],
            },
        },
    },
];

export const fulfillmentSheetView: ViewConfig = {
    model: "fulfillments",
    viewType: "sheet",
    accessModel: "fulfillments",
    apiUrl: "/api/eCommerce/fulfillment",
    header: {titleField: "trackingNumber", subtitleKey: "fulfillmentSubtitle", showCloseButton: true},
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
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "fulfillmentStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "carrier",
                                widget: "#DisplayCard",
                                label: "carrier",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "trackingNumber",
                                widget: "#DisplayCard",
                                label: "trackingNumber",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "trackingUrl",
                                widget: "#DisplayCard",
                                label: "trackingUrl",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippedAt",
                                widget: "#DisplayCard",
                                label: "shippedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "estimatedDeliveryAt",
                                widget: "#DisplayCard",
                                label: "estimatedDeliveryAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "deliveredAt",
                                widget: "#DisplayCard",
                                label: "deliveredAt",
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
            dependent: "notes",
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            field: {
                                name: "notes",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm whitespace-pre-wrap"},
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
                storageKey: "fulfillment.sheet.items.listDisplay",
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
                                            compactSummaryFields: ["orderItemId", "quantity"],
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

export const fulfillmentCreateFormView: ViewConfig = {
    model: "fulfillments",
    viewType: "form",
    viewMode: "create",
    accessModel: "fulfillments",
    apiUrl: "/api/eCommerce/fulfillment",
    method: "PUT",
    nodes: fulfillmentFormFields,
};

export const fulfillmentEditFormView: ViewConfig = {
    model: "fulfillments",
    viewType: "form",
    viewMode: "edit",
    accessModel: "fulfillments",
    apiUrl: "/api/eCommerce/fulfillment",
    method: "PATCH",
    nodes: fulfillmentFormFields,
};

export const fulfillmentViews: ViewConfig[] = [fulfillmentSheetView, fulfillmentCreateFormView, fulfillmentEditFormView];
