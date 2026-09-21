import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const shippingRateTypeOptions = [
    {value: "flat", label: "form.shippingRateType.flat"},
    {value: "weight", label: "form.shippingRateType.weight"},
    {value: "price", label: "form.shippingRateType.price"},
    {value: "quantity", label: "form.shippingRateType.quantity"},
    {value: "free", label: "form.shippingRateType.free"},
];

const shippingZoneFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.geographySectionTitle", defaultOpen: true},
        children: [
            {
                render: "#Field",
                field: {
                    name: "countries",
                    widget: "#ObjectIdChipsInput",
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
                    widget: "#ObjectIdChipsInput",
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
                    widget: "#StringArrayInput",
                    label: "form.postalCodePatternsLabel",
                    placeholder: "form.postalCodePatternsPlaceholder",
                    widgetProps: {removeTooltipKey: "form.removePostalCodePattern"},
                },
            },
        ],
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
                        {render: "#DisplayCard", permissions: {read: "name"}, field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#IconTruckDelivery"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#DisplayCard",
                                label: "isActive",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "company"},
                            field: {
                                name: "company",
                                widget: "#DisplayCard",
                                label: "company",
                                widgetProps: {icon: "#IconBuilding", parent: "company", valuePath: ["name"]},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "geography"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "countries"},
                            field: {
                                name: "countries",
                                widget: "#DisplayCard",
                                label: "countries",
                                widgetProps: {
                                    icon: "#Globe",
                                    tooltip: "countries",
                                    valueType: "linkedObjectRefCardList",
                                    labelField: "name",
                                    linkedRefListLayout: "responsive4",
                                    linkedRefListPath: "countries",
                                    linkedSheetModel: "countries",
                                    linkedSheetWidget: "#CountrySheetView",
                                    linkedSheetEntityProp: "country",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "states"},
                            field: {
                                name: "states",
                                widget: "#DisplayCard",
                                label: "states",
                                widgetProps: {
                                    icon: "#IconMapPin",
                                    tooltip: "states",
                                    valueType: "linkedObjectRefCardList",
                                    labelField: "name",
                                    linkedRefListLayout: "responsive4",
                                    linkedRefListPath: "states",
                                    linkedSheetModel: "states",
                                    linkedSheetWidget: "#StateSheetView",
                                    linkedSheetEntityProp: "state",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "postalCodePatterns"},
                            field: {
                                name: "postalCodePatterns",
                                widget: "#DisplayCard",
                                label: "postalCodePatterns",
                                widgetProps: {icon: "#IconMail", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "shippingZone.sheet.rates.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "rates",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    dependent: "rates",
                    permissions: {read: "rates"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "rates"},
                                    field: {
                                        name: "rates",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["name", "type", "price", "carrier"],
                                            fields: [
                                                {
                                                    name: "name",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                },
                                                {
                                                    name: "type",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    languageKeyCategory: "shippingRateType",
                                                    labelKey: "rateType",
                                                },
                                                {
                                                    name: "price",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "ratePrice",
                                                },
                                                {
                                                    name: "carrier",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "carrier",
                                                },
                                                {
                                                    name: "estimatedDeliveryDays",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "estimatedDeliveryDays",
                                                },
                                                {
                                                    name: "conditions.minWeight",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "minWeight",
                                                },
                                                {
                                                    name: "conditions.maxWeight",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "maxWeight",
                                                },
                                                {
                                                    name: "conditions.minOrderAmount",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "minOrderAmount",
                                                },
                                                {
                                                    name: "conditions.maxOrderAmount",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "maxOrderAmount",
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
