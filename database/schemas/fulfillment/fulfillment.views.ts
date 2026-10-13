import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {
    FULFILLMENT_CARRIER_MAX,
    FULFILLMENT_TRACKING_NUMBER_MAX,
    FULFILLMENT_TRACKING_URL_MAX,
    FULFILLMENT_NOTES_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";

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
                    name: "carrier",
                    widget: "#Input",
                    label: "form.carrierLabel",
                    placeholder: "form.carrierPlaceholder",
                    widgetProps: {maxLength: FULFILLMENT_CARRIER_MAX},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "trackingNumber",
                    widget: "#Input",
                    label: "form.trackingNumberLabel",
                    placeholder: "form.trackingNumberPlaceholder",
                    widgetProps: {maxLength: FULFILLMENT_TRACKING_NUMBER_MAX},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "trackingUrl",
                    widget: "#Input",
                    label: "form.trackingUrlLabel",
                    placeholder: "form.trackingUrlPlaceholder",
                    widgetProps: {maxLength: FULFILLMENT_TRACKING_URL_MAX},
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
        ],
    },
    {
        render: "#Field",
        field: {
            name: "notes",
            widget: "#Textarea",
            label: "form.notesLabel",
            placeholder: "form.notesPlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: FULFILLMENT_NOTES_MAX},
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
                                    widget: "#ApiSelect",
                                    label: "form.orderItemIdLabel",
                                    placeholder: "form.orderItemIdPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/productOrder/lineSelect",
                                        method: "POST",
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

const fulfillmentEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        permissions: {writeAny: ["order", "carrier", "trackingNumber", "trackingUrl", "estimatedDeliveryAt"]},
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
                permissions: {read: "carrier", write: "carrier"},
                field: {
                    name: "carrier",
                    widget: "#Input",
                    label: "form.carrierLabel",
                    placeholder: "form.carrierPlaceholder",
                    widgetProps: {maxLength: FULFILLMENT_CARRIER_MAX},
                },
            },
            {
                render: "#Field",
                permissions: {read: "trackingNumber", write: "trackingNumber"},
                field: {
                    name: "trackingNumber",
                    widget: "#Input",
                    label: "form.trackingNumberLabel",
                    placeholder: "form.trackingNumberPlaceholder",
                    widgetProps: {maxLength: FULFILLMENT_TRACKING_NUMBER_MAX},
                },
            },
            {
                render: "#Field",
                permissions: {read: "trackingUrl", write: "trackingUrl"},
                field: {
                    name: "trackingUrl",
                    widget: "#Input",
                    label: "form.trackingUrlLabel",
                    placeholder: "form.trackingUrlPlaceholder",
                    widgetProps: {maxLength: FULFILLMENT_TRACKING_URL_MAX},
                },
            },
            {
                render: "#Field",
                permissions: {read: "estimatedDeliveryAt", write: "estimatedDeliveryAt"},
                field: {
                    name: "estimatedDeliveryAt",
                    widget: "#DateInput",
                    label: "form.estimatedDeliveryAtLabel",
                    widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                },
            },
        ],
    },
    {
        render: "#Field",
        permissions: {read: "notes", write: "notes"},
        field: {
            name: "notes",
            widget: "#Textarea",
            label: "form.notesLabel",
            placeholder: "form.notesPlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: FULFILLMENT_NOTES_MAX},
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
                                permissions: {read: "items", write: "items"},
                                field: {
                                    name: "orderItemId",
                                    widget: "#ApiSelect",
                                    label: "form.orderItemIdLabel",
                                    placeholder: "form.orderItemIdPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/productOrder/lineSelect",
                                        method: "POST",
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
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "fulfillmentStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "carrier"},
                            field: {
                                name: "carrier",
                                widget: "#DisplayCard",
                                label: "carrier",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "trackingNumber"},
                            field: {
                                name: "trackingNumber",
                                widget: "#DisplayCard",
                                label: "trackingNumber",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "trackingUrl"},
                            field: {
                                name: "trackingUrl",
                                widget: "#DisplayCard",
                                label: "trackingUrl",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippedAt"},
                            field: {
                                name: "shippedAt",
                                widget: "#DisplayCard",
                                label: "shippedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "estimatedDeliveryAt"},
                            field: {
                                name: "estimatedDeliveryAt",
                                widget: "#DisplayCard",
                                label: "estimatedDeliveryAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "deliveredAt"},
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
                            permissions: {read: "notes"},
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
                                            entityCards: true,
                                            columns: 2,
                                            compactSummaryFields: ["snapshot.title", "quantity"],
                                            fields: [
                                                {
                                                    name: "snapshot.title",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemSnapshotTitle",
                                                    icon: "#IconTag",
                                                },
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "sku"],
                                                    joinSeparator: " · ",
                                                    labelKey: "itemProduct",
                                                    linkedSheetModel: "products",
                                                    linkedSheetWidget: "#ProductSheetView",
                                                    linkedSheetEntityProp: "product",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "variant",
                                                    type: "linkedRef",
                                                    className: "text-sm",
                                                    valuePath: ["sku"],
                                                    labelKey: "itemVariant",
                                                    linkedSheetModel: "productVariants",
                                                    linkedSheetWidget: "#ProductVariantSheetView",
                                                    linkedSheetEntityProp: "entity",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "snapshot.sku",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemSnapshotSku",
                                                    icon: "#Hash",
                                                },
                                                {
                                                    name: "snapshot.variantLabel",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemSnapshotVariantLabel",
                                                    icon: "#IconTag",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantity",
                                                    icon: "#Hash",
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
    nodes: fulfillmentEditFormNodes,
};

export const fulfillmentViews: ViewConfig[] = [fulfillmentSheetView, fulfillmentCreateFormView, fulfillmentEditFormView];
