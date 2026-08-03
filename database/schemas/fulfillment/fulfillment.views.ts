import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

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
                            render: "#SmallInfoCard",
                            field: {
                                name: "status",
                                widget: "#SmallInfoCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "fulfillmentStatus"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "carrier",
                                widget: "#SmallInfoCard",
                                label: "carrier",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "trackingNumber",
                                widget: "#SmallInfoCard",
                                label: "trackingNumber",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "trackingUrl",
                                widget: "#SmallInfoCard",
                                label: "trackingUrl",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippedAt",
                                widget: "#SmallInfoCard",
                                label: "shippedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "estimatedDeliveryAt",
                                widget: "#SmallInfoCard",
                                label: "estimatedDeliveryAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "deliveredAt",
                                widget: "#SmallInfoCard",
                                label: "deliveredAt",
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
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
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
