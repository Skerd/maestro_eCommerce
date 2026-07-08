import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const shippingRateTypeOptions = [
    {value: "flat", label: "form.shippingRateType.flat"},
    {value: "weight", label: "form.shippingRateType.weight"},
    {value: "price", label: "form.shippingRateType.price"},
    {value: "quantity", label: "form.shippingRateType.quantity"},
    {value: "free", label: "form.shippingRateType.free"},
];

const shippingZoneFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
        ],
    },
    {
        render: "#Field",
        field: {
            name: "countries",
            widget: "#FormObjectIdChips",
            label: "form.countriesLabel",
            widgetProps: {
                apiUrl: "/api/auxiliary/country/select",
                method: "POST",
                placeholderKey: "form.selectCountry",
                removeTooltipKey: "form.removeCountry",
                selectPageSizeCreate: 50,
                selectPageSizeEdit: 200,
                labelRefFormExtraKey: "countries",
            },
        },
    },
    {
        render: "#Field",
        field: {
            name: "states",
            widget: "#FormObjectIdChips",
            label: "form.statesLabel",
            widgetProps: {
                apiUrl: "/api/auxiliary/state/select",
                method: "POST",
                placeholderKey: "form.selectState",
                removeTooltipKey: "form.removeState",
                selectPageSizeCreate: 50,
                selectPageSizeEdit: 200,
                labelRefFormExtraKey: "states",
            },
        },
    },
    {
        render: "#Field",
        field: {
            name: "postalCodePatterns",
            widget: "#StringArrayField",
            label: "form.postalCodePatternsLabel",
            placeholder: "form.postalCodePatternsPlaceholder",
            widgetProps: {removeTooltipKey: "form.removePostalCodePattern"},
        },
    },
    {
        render: "#Field",
        field: {
            name: "rates",
            widget: "#FormRepeater",
            widgetProps: {
                title: "form.ratesSectionTitle",
                arrayField: "rates",
                defaultItem: {
                    name: "",
                    type: "flat",
                    price: 0,
                    carrier: "",
                    estimatedDeliveryDays: undefined,
                    conditions: {},
                },
                addLabel: "form.rateAddRow",
                removeLabel: "form.rateRemoveRow",
                rowTitleFields: ["name"],
                rowTitlePlaceholder: "form.rateRowTitle",
                rowTemplate: [
                    {
                        render: "div",
                        props: {className: "space-y-4"},
                        children: [
                            {
                                render: "#FormGrid",
                                props: {columns: 2},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {name: "name", widget: "#Input", label: "form.rateNameLabel", required: true},
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "type",
                                            widget: "#Select",
                                            label: "form.rateTypeLabel",
                                            required: true,
                                            widgetProps: {options: shippingRateTypeOptions, className: "grow w-full"},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "price",
                                            widget: "#Input",
                                            label: "form.ratePriceLabel",
                                            widgetProps: {type: "number", min: 0},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {name: "carrier", widget: "#Input", label: "form.carrierLabel"},
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "estimatedDeliveryDays",
                                            widget: "#Input",
                                            label: "form.estimatedDeliveryDaysLabel",
                                            widgetProps: {type: "number", min: 0},
                                        },
                                    },
                                ],
                            },
                            {
                                render: "#TitleWithCollapse",
                                props: {title: "form.rateConditionsSectionTitle"},
                                children: [
                                    {
                                        render: "#FormGrid",
                                        props: {columns: 2},
                                        children: [
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "conditions.minWeight",
                                                    widget: "#Input",
                                                    label: "form.minWeightLabel",
                                                    widgetProps: {type: "number", min: 0},
                                                },
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "conditions.maxWeight",
                                                    widget: "#Input",
                                                    label: "form.maxWeightLabel",
                                                    widgetProps: {type: "number", min: 0},
                                                },
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "conditions.minOrderAmount",
                                                    widget: "#Input",
                                                    label: "form.minOrderAmountLabel",
                                                    widgetProps: {type: "number", min: 0},
                                                },
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "conditions.maxOrderAmount",
                                                    widget: "#Input",
                                                    label: "form.maxOrderAmountLabel",
                                                    widgetProps: {type: "number", min: 0},
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    },
];

export const shippingZoneSheetView: ViewConfig = {
    model: "shippingZones",
    viewType: "sheet",
    accessModel: "shippingZones",
    apiUrl: "/api/eCommerce/shippingZone",
    header: {titleField: "name", subtitleKey: "shippingZoneSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                    ],
                },
            ],
        },
    ],
};

export const shippingZoneCreateFormView: ViewConfig = {
    model: "shippingZones",
    viewType: "form",
    viewMode: "create",
    accessModel: "shippingZones",
    apiUrl: "/api/eCommerce/shippingZone",
    method: "PUT",
    nodes: shippingZoneFormFields,
};

export const shippingZoneEditFormView: ViewConfig = {
    model: "shippingZones",
    viewType: "form",
    viewMode: "edit",
    accessModel: "shippingZones",
    apiUrl: "/api/eCommerce/shippingZone",
    method: "PATCH",
    nodes: shippingZoneFormFields,
};

export const shippingZoneViews: ViewConfig[] = [shippingZoneSheetView, shippingZoneCreateFormView, shippingZoneEditFormView];
