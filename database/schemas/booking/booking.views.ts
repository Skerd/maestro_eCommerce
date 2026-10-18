import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const bookingSheetView: ViewConfig = {
    model: "bookings",
    viewType: "sheet",
    accessModel: "bookings",
    apiUrl: "/api/eCommerceMarketplace/booking",
    header: {
        titleField: "provider.fullName",
        subtitleKey: "bookingSubtitle",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
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
                                    icon: "#Package",
                                    valuePath: ["order.status", "order._id"],
                                    joinSeparator: " · ",
                                    linkedRefPath: "order",
                                    linkedSheetModel: "orders",
                                    linkedSheetWidget: "#OrderSheetView",
                                    linkedSheetEntityProp: "order",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "provider"},
                            field: {
                                name: "provider",
                                widget: "#DisplayCard",
                                label: "provider",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["provider.fullName", "provider.name"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "startAt"},
                            field: {
                                name: "startAt",
                                widget: "#DisplayCard",
                                label: "startAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "endAt"},
                            field: {
                                name: "endAt",
                                widget: "#DisplayCard",
                                label: "endAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "timezone"},
                            field: {
                                name: "timezone",
                                widget: "#DisplayCard",
                                label: "timezone",
                                widgetProps: {icon: "#Globe"},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

const bookingFormFields: ViewConfig["nodes"] = [
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
                    required: true,
                    widgetProps: {apiUrl: "/api/eCommerceMarketplace/order/select"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "startAt",
                    widget: "#Input",
                    label: "form.startAtLabel",
                    placeholder: "form.startAtPlaceholder",
                    required: true,
                    widgetProps: {type: "datetime-local"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "endAt",
                    widget: "#Input",
                    label: "form.endAtLabel",
                    placeholder: "form.endAtPlaceholder",
                    required: true,
                    widgetProps: {type: "datetime-local"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "timezone",
                    widget: "#Input",
                    label: "form.timezoneLabel",
                    placeholder: "form.timezonePlaceholder",
                    widgetProps: {},
                },
            },
        ],
    },
];

export const bookingCreateFormView: ViewConfig = {
    model: "bookings",
    viewType: "form",
    viewMode: "create",
    accessModel: "bookings",
    apiUrl: "/api/eCommerceMarketplace/booking",
    method: "PUT",
    nodes: bookingFormFields,
};

export const bookingViews: ViewConfig[] = [bookingSheetView, bookingCreateFormView];
