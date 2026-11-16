import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {
    FULFILLMENT_CARRIER_MAX,
    FULFILLMENT_TRACKING_NUMBER_MAX,
    FULFILLMENT_TRACKING_URL_MAX,
    FULFILLMENT_NOTES_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";

const textareaScrollClass = "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto";

// Task order: which order and how it ships, then the lines in the parcel, then a note (UX-04).
const fulfillmentCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.shipmentSectionTitle", defaultOpen: true},
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
                            widgetProps: {valueFormat: "YYYY-MM-DD HH:mm"},
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
                render: "#Field",
                field: {
                    name: "notes",
                    widget: "#Textarea",
                    label: "form.notesLabel",
                    placeholder: "form.notesPlaceholder",
                    widgetProps: {rows: 4, className: textareaScrollClass, maxLength: FULFILLMENT_NOTES_MAX},
                },
            },
        ],
    },
];

const fulfillmentEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.shipmentSectionTitle", defaultOpen: true},
        permissions: {readAny: ["order", "carrier", "trackingNumber", "trackingUrl", "estimatedDeliveryAt"], writeAny: ["order", "carrier", "trackingNumber", "trackingUrl", "estimatedDeliveryAt"]},
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
                            widgetProps: {valueFormat: "YYYY-MM-DD HH:mm"},
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
                        ],
                    },
                ],
            },
        },
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.notesSectionTitle", defaultOpen: true},
        permissions: {readAny: ["notes"], writeAny: ["notes"]},
        children: [
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
        ],
    },
];

export const fulfillmentSheetView: ViewConfig = {
    model: "fulfillments",
    viewType: "sheet",
    sheetWidget: "#FulfillmentSheetView",
    accessModel: "fulfillments",
    apiUrl: "/api/eCommerce/fulfillment",
    header: {titleField: "trackingNumber", subtitleKey: "fulfillmentSubtitle", showCloseButton: true},
    nodes: [
        // The status is the header badge, the carrier is in the title and the tracking number is the code badge (UX-01/02).
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
                            dependent: "trackingUrl",
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
                            dependent: "shippedAt",
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
                            dependent: "estimatedDeliveryAt",
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
                            dependent: "deliveredAt",
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
            render: "#ReferencesViewModeScope",
            dependent: "items",
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
                                            compactSummaryFields: ["snapshot", "quantity"],
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
    nodes: fulfillmentCreateFormNodes,
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
