import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const fulfillmentStatusOptions = [
    {value: "pending", label: "form.fulfillmentStatus.pending"},
    {value: "shipped", label: "form.fulfillmentStatus.shipped"},
    {value: "delivered", label: "form.fulfillmentStatus.delivered"},
    {value: "failed", label: "form.fulfillmentStatus.failed"},
];

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
            {render: "#Field", field: {name: "carrier", widget: "#Input", label: "form.carrierLabel"}},
            {render: "#Field", field: {name: "trackingNumber", widget: "#Input", label: "form.trackingNumberLabel"}},
            {render: "#Field", field: {name: "trackingUrl", widget: "#Input", label: "form.trackingUrlLabel"}},
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
    {render: "#Field", field: {name: "notes", widget: "#Textarea", label: "form.notesLabel"}},
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
                            {render: "#Field", field: {name: "orderItemId", widget: "#Input", label: "form.orderItemIdLabel", required: true}},
                            {render: "#Field", field: {name: "quantity", widget: "#Input", label: "form.quantityLabel", required: true, widgetProps: {type: "number", min: 1}}},
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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "fulfillmentStatus"}}},
                        {render: "#SmallInfoCard", field: {name: "carrier", widget: "#SmallInfoCard", label: "carrier", widgetProps: {icon: "#IconTruck"}}},
                        {render: "#SmallInfoCard", field: {name: "trackingNumber", widget: "#SmallInfoCard", label: "trackingNumber", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "trackingUrl", widget: "#SmallInfoCard", label: "trackingUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", field: {name: "shippedAt", widget: "#SmallInfoCard", label: "shippedAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", field: {name: "estimatedDeliveryAt", widget: "#SmallInfoCard", label: "estimatedDeliveryAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", field: {name: "deliveredAt", widget: "#SmallInfoCard", label: "deliveredAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", field: {name: "notes", widget: "#SmallInfoCard", label: "notes", widgetProps: {icon: "#IconNote"}}},
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
