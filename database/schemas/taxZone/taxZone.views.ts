import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const taxRateAppliesToOptions = [
    {value: "all", label: "form.taxRateAppliesTo.all"},
    {value: "physical", label: "form.taxRateAppliesTo.physical"},
    {value: "digital", label: "form.taxRateAppliesTo.digital"},
];

const taxZoneFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
                    {render: "#Field", field: {name: "priority", widget: "#Input", label: "form.priorityLabel", widgetProps: {type: "number", min: 0}}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.geographySectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "country",
                            widget: "#ApiSelect",
                            label: "form.countryLabel",
                            placeholder: "form.countryPlaceholder",
                            required: true,
                            widgetProps: {
                                apiUrl: "/api/auxiliary/country/select",
                                method: "POST",
                                pageSize: 50,
                                normalizeEmptyToUndefined: true,
                                cascadeClearFormFields: ["states"],
                            },
                        },
                    },
                ],
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
                        postBodyFromFormFields: [{field: "country", paramName: "country"}],
                        enableWhenFormFieldsNonEmpty: ["country"],
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
                defaultItem: {name: "", rate: 0, isCompound: false, appliesTo: "all"},
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
                                            name: "rate",
                                            widget: "#Input",
                                            label: "form.rateValueLabel",
                                            required: true,
                                            widgetProps: {type: "number", min: 0, max: 100},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "appliesTo",
                                            widget: "#Select",
                                            label: "form.rateAppliesToLabel",
                                            widgetProps: {options: taxRateAppliesToOptions, className: "grow w-full"},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {name: "isCompound", widget: "#Checkbox", label: "form.isCompoundLabel"},
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

export const taxZoneSheetView: ViewConfig = {
    model: "taxZones",
    viewType: "sheet",
    accessModel: "taxZones",
    apiUrl: "/api/eCommerce/taxZone",
    header: {titleField: "name", subtitleKey: "taxZoneSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#IconReceiptTax"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#SmallInfoCard",
                                label: "isActive",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "priority"},
                            field: {name: "priority", widget: "#SmallInfoCard", label: "priority", widgetProps: {icon: "#Hash"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "company"},
                            field: {
                                name: "company",
                                widget: "#SmallInfoCard",
                                label: "company",
                                widgetProps: {icon: "#IconBuilding", parent: "company", valuePath: ["name"]},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdAt"},
                            field: {
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#IconCalendar", format: "dateTime"},
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
                            render: "#SmallInfoCard",
                            permissions: {read: "country"},
                            field: {
                                name: "country",
                                widget: "#SmallInfoCard",
                                label: "country",
                                widgetProps: {
                                    icon: "#Globe",
                                    parent: "country",
                                    valuePath: ["name"],
                                    linkedRefPath: "country",
                                    linkedSheetModel: "countries",
                                    linkedSheetWidget: "#CountrySheetView",
                                    linkedSheetEntityProp: "country",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "states"},
                            field: {
                                name: "states",
                                widget: "#SmallInfoCard",
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
                            render: "#SmallInfoCard",
                            permissions: {read: "postalCodePatterns"},
                            field: {
                                name: "postalCodePatterns",
                                widget: "#SmallInfoCard",
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
                storageKey: "taxZone.sheet.rates.listDisplay",
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
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "rates"},
                                    field: {
                                        name: "rates",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["name", "rate", "appliesTo"],
                                            fields: [
                                                {
                                                    name: "name",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                },
                                                {
                                                    name: "rate",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "rateValue",
                                                },
                                                {
                                                    name: "appliesTo",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    languageKeyCategory: "taxRateAppliesTo",
                                                    labelKey: "rateAppliesTo",
                                                },
                                                {
                                                    name: "isCompound",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    languageKeyCategory: "yesNo",
                                                    labelKey: "isCompound",
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
    ],
};

export const taxZoneCreateFormView: ViewConfig = {
    model: "taxZones",
    viewType: "form",
    viewMode: "create",
    accessModel: "taxZones",
    apiUrl: "/api/eCommerce/taxZone",
    method: "PUT",
    nodes: taxZoneFormFields,
};

export const taxZoneEditFormView: ViewConfig = {
    model: "taxZones",
    viewType: "form",
    viewMode: "edit",
    accessModel: "taxZones",
    apiUrl: "/api/eCommerce/taxZone",
    method: "PATCH",
    nodes: taxZoneFormFields,
};

export const taxZoneViews: ViewConfig[] = [taxZoneSheetView, taxZoneCreateFormView, taxZoneEditFormView];
