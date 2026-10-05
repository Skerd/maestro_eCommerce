import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    SHIPPING_ZONE_CARRIER_MAX,
    SHIPPING_ZONE_NAME_MAX,
    SHIPPING_ZONE_POSTAL_CODE_PATTERN_MAX,
    SHIPPING_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
    SHIPPING_ZONE_RATE_NAME_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {
                                    icon: "#IconTruckDelivery"
                                }
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#DisplayCard",
                                label: "isActive",
                                widgetProps: {
                                    icon: "#IconToggleRight",
                                    type: "boolean"
                                },
                            },
                        }
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
                            permissions: {read: "postalCodePatterns"},
                            field: {
                                name: "postalCodePatterns",
                                widget: "#DisplayCard",
                                label: "postalCodePatterns",
                                widgetProps: {
                                    icon: "#IconMail",
                                    valueType: "stringBadgeList",
                                },
                            },
                        },
                    ],
                },
                {
                    render: "#ReferencesViewModeScope",
                    props: {
                        storageKey: "shippingZone.sheet.countries.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "countries",
                                titleActions: "#ReferencesViewModeToggle",
                                // Nested under geography — avoid a second CollapsibleContent (overflow:hidden clips cards).
                                collapsible: false,
                            },
                            dependent: "countries",
                            permissions: {read: "countries"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "countries"},
                                            field: {
                                                name: "countries",
                                                widget: "#ReferencesRender",
                                                widgetProps: {
                                                    cardWidget: "#CountryCard",
                                                    itemDataProp: "country",
                                                    pageSize: 6,
                                                    columns: 3,
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#Globe",
                                                        label: "country",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "countries",
                                                        linkedSheetWidget: "#CountrySheetView",
                                                        linkedSheetEntityProp: "country",
                                                    },
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
                    render: "#ReferencesViewModeScope",
                    props: {
                        storageKey: "shippingZone.sheet.states.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "states",
                                titleActions: "#ReferencesViewModeToggle",
                                // Nested under geography — avoid a second CollapsibleContent (overflow:hidden clips cards).
                                collapsible: false,
                            },
                            dependent: "states",
                            permissions: {read: "states"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "states"},
                                            field: {
                                                name: "states",
                                                widget: "#ReferencesRender",
                                                widgetProps: {
                                                    cardWidget: "#StateCard",
                                                    itemDataProp: "state",
                                                    pageSize: 6,
                                                    columns: 3,
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconMapPin",
                                                        label: "state",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "states",
                                                        linkedSheetWidget: "#StateSheetView",
                                                        linkedSheetEntityProp: "state",
                                                    },
                                                },
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
                                            compactSummaryFields: ["name", "type", "price"],
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

const shippingRateTypeOptions = [
    {value: "flat", label: "form.shippingRateType.flat"},
    {value: "weight", label: "form.shippingRateType.weight"},
    {value: "price", label: "form.shippingRateType.price"},
    {value: "quantity", label: "form.shippingRateType.quantity"},
    {value: "free", label: "form.shippingRateType.free"},
];

const shippingZoneRateRepeaterProps = {
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
            render: "#FormGrid",
            props: {columns: 2},
            children: [
                {
                    render: "#Field",
                    field: {
                        name: "name",
                        widget: "#Input",
                        label: "form.rateNameLabel",
                        placeholder: "form.rateNamePlaceholder",
                        required: true,
                        widgetProps: {maxLength: SHIPPING_ZONE_RATE_NAME_MAX},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "type",
                        widget: "#Select",
                        label: "form.rateTypeLabel",
                        placeholder: "form.rateTypePlaceholder",
                        required: true,
                        widgetProps: {
                            options: shippingRateTypeOptions,
                            className: "grow w-full",
                        },
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "price",
                        widget: "#Input",
                        label: "form.ratePriceLabel",
                        placeholder: "form.ratePricePlaceholder",
                        widgetProps: {type: "number", min: 0},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "carrier",
                        widget: "#Input",
                        label: "form.carrierLabel",
                        placeholder: "form.carrierPlaceholder",
                        widgetProps: {maxLength: SHIPPING_ZONE_CARRIER_MAX},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "estimatedDeliveryDays",
                        widget: "#Input",
                        label: "form.estimatedDeliveryDaysLabel",
                        placeholder: "form.estimatedDeliveryDaysPlaceholder",
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
                                placeholder: "form.minWeightPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "conditions.maxWeight",
                                widget: "#Input",
                                label: "form.maxWeightLabel",
                                placeholder: "form.maxWeightPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "conditions.minOrderAmount",
                                widget: "#Input",
                                label: "form.minOrderAmountLabel",
                                placeholder: "form.minOrderAmountPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "conditions.maxOrderAmount",
                                widget: "#Input",
                                label: "form.maxOrderAmountLabel",
                                placeholder: "form.maxOrderAmountPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

const shippingZoneCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "name",
                            widget: "#Input",
                            label: "form.nameLabel",
                            placeholder: "form.namePlaceholder",
                            required: true,
                            widgetProps: {maxLength: SHIPPING_ZONE_NAME_MAX},
                        },
                    },
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
                    widgetProps: {
                        removeTooltipKey: "form.removePostalCodePattern",
                        maxItems: SHIPPING_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
                        maxLength: SHIPPING_ZONE_POSTAL_CODE_PATTERN_MAX,
                    },
                },
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "rates",
            widget: "#FormRepeater",
            widgetProps: shippingZoneRateRepeaterProps,
        },
    },
];

const shippingZoneEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["name"],
            writeAny: ["name"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "name", write: "name"},
                        field: {
                            name: "name",
                            widget: "#Input",
                            label: "form.nameLabel",
                            placeholder: "form.namePlaceholder",
                            required: true,
                            widgetProps: {maxLength: SHIPPING_ZONE_NAME_MAX},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.geographySectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["countries", "states", "postalCodePatterns"],
            writeAny: ["countries", "states", "postalCodePatterns"],
        },
        children: [
            {
                render: "#Field",
                permissions: {read: "countries", write: "countries"},
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
                permissions: {read: "states", write: "states"},
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
                permissions: {read: "postalCodePatterns", write: "postalCodePatterns"},
                field: {
                    name: "postalCodePatterns",
                    widget: "#StringArrayInput",
                    label: "form.postalCodePatternsLabel",
                    placeholder: "form.postalCodePatternsPlaceholder",
                    widgetProps: {
                        removeTooltipKey: "form.removePostalCodePattern",
                        maxItems: SHIPPING_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
                        maxLength: SHIPPING_ZONE_POSTAL_CODE_PATTERN_MAX,
                    },
                },
            },
        ],
    },
    {
        render: "#Field",
        permissions: {readAny: ["rates"], writeAny: ["rates"]},
        field: {
            name: "rates",
            widget: "#FormRepeater",
            widgetProps: shippingZoneRateRepeaterProps,
        },
    },
];

export const shippingZoneCreateFormView: ViewConfig = {
    model: "shippingZones",
    viewType: "form",
    viewMode: "create",
    accessModel: "shippingZones",
    apiUrl: "/api/eCommerce/shippingZone",
    method: "PUT",
    nodes: shippingZoneCreateFormNodes,
};

export const shippingZoneEditFormView: ViewConfig = {
    model: "shippingZones",
    viewType: "form",
    viewMode: "edit",
    accessModel: "shippingZones",
    apiUrl: "/api/eCommerce/shippingZone",
    method: "PATCH",
    nodes: shippingZoneEditFormNodes,
};

export const shippingZoneViews: ViewConfig[] = [shippingZoneSheetView, shippingZoneCreateFormView, shippingZoneEditFormView];
