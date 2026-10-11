import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    TAX_ZONE_NAME_MAX,
    TAX_ZONE_POSTAL_CODE_PATTERN_MAX,
    TAX_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
    TAX_ZONE_RATE_NAME_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {
                                    icon: "#IconReceiptTax"
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
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "priority"},
                            field: {
                                name: "priority",
                                widget: "#DisplayCard",
                                label: "priority",
                                widgetProps: {
                                    icon: "#Hash",
                                    type: "number"
                                }
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
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "country"},
                            field: {
                                name: "country",
                                widget: "#DisplayCard",
                                label: "country",
                                widgetProps: {
                                    icon: "#Globe",
                                    flagCodePath: "country.code",
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
                            render: "#DisplayCard",
                            permissions: {read: "postalCodePatterns"},
                            field: {
                                name: "postalCodePatterns",
                                widget: "#DisplayCard",
                                label: "postalCodePatterns",
                                widgetProps: {
                                    icon: "#IconMail",
                                    valueType: "stringBadgeList"
                                },
                            },
                        },
                    ],
                },
                {
                    render: "#ReferencesViewModeScope",
                    props: {
                        storageKey: "taxZone.sheet.states.listDisplay",
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
                                            entityCards: true,
                                            columns: 3,
                                            compactSummaryFields: ["name", "rate", "appliesTo"],
                                            fields: [
                                                {
                                                    name: "name",
                                                    type: "text",
                                                    icon: "#IconReceiptTax",
                                                },
                                                {
                                                    name: "rate",
                                                    type: "text",
                                                    icon: "#IconPercentage",
                                                    labelKey: "rateValue",
                                                },
                                                {
                                                    name: "appliesTo",
                                                    type: "text",
                                                    icon: "#IconPackage",
                                                    languageKeyCategory: "taxRateAppliesTo",
                                                    labelKey: "rateAppliesTo",
                                                },
                                                {
                                                    name: "isCompound",
                                                    type: "text",
                                                    icon: "#IconLayersIntersect",
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
        lifecycleSheetGroup,
    ],
};

const taxZoneCreateFormNodes: ViewConfig["nodes"] = [
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
                            widgetProps: {maxLength: TAX_ZONE_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "priority",
                            widget: "#Input",
                            label: "form.priorityLabel",
                            placeholder: "form.priorityPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
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
                        postBodyFromFormFields: [{field: "country", paramName: "country"}],
                        enableWhenFormFieldsNonEmpty: ["country"],
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
                        maxItems: TAX_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
                        maxLength: TAX_ZONE_POSTAL_CODE_PATTERN_MAX,
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
                                        field: {
                                            name: "name",
                                            widget: "#Input",
                                            label: "form.rateNameLabel",
                                            placeholder: "form.rateNamePlaceholder",
                                            required: true,
                                            widgetProps: {maxLength: TAX_ZONE_RATE_NAME_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "rate",
                                            widget: "#Input",
                                            label: "form.rateValueLabel",
                                            placeholder: "form.rateValuePlaceholder",
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
                                            placeholder: "form.rateAppliesToPlaceholder",
                                            widgetProps: {
                                                options: [
                                                    {value: "all", label: "form.taxRateAppliesTo.all"},
                                                    {value: "physical", label: "form.taxRateAppliesTo.physical"},
                                                    {value: "digital", label: "form.taxRateAppliesTo.digital"},
                                                ],
                                                className: "grow w-full"
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "isCompound",
                                            widget: "#Checkbox",
                                            label: "form.isCompoundLabel"
                                        },
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

const taxZoneEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["name", "priority"],
            writeAny: ["name", "priority"],
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
                            widgetProps: {maxLength: TAX_ZONE_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "priority", write: "priority"},
                        field: {
                            name: "priority",
                            widget: "#Input",
                            label: "form.priorityLabel",
                            placeholder: "form.priorityPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.geographySectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["country", "states", "postalCodePatterns"],
            writeAny: ["country", "states", "postalCodePatterns"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "country", write: "country"},
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
                        postBodyFromFormFields: [{field: "country", paramName: "country"}],
                        enableWhenFormFieldsNonEmpty: ["country"],
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
                        maxItems: TAX_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
                        maxLength: TAX_ZONE_POSTAL_CODE_PATTERN_MAX,
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
                                        field: {
                                            name: "name",
                                            widget: "#Input",
                                            label: "form.rateNameLabel",
                                            placeholder: "form.rateNamePlaceholder",
                                            required: true,
                                            widgetProps: {maxLength: TAX_ZONE_RATE_NAME_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "rate",
                                            widget: "#Input",
                                            label: "form.rateValueLabel",
                                            placeholder: "form.rateValuePlaceholder",
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
                                            placeholder: "form.rateAppliesToPlaceholder",
                                            widgetProps: {
                                                options: [
                                                    {value: "all", label: "form.taxRateAppliesTo.all"},
                                                    {value: "physical", label: "form.taxRateAppliesTo.physical"},
                                                    {value: "digital", label: "form.taxRateAppliesTo.digital"},
                                                ],
                                                className: "grow w-full"
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "isCompound",
                                            widget: "#Checkbox",
                                            label: "form.isCompoundLabel"
                                        },
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

export const taxZoneCreateFormView: ViewConfig = {
    model: "taxZones",
    viewType: "form",
    viewMode: "create",
    accessModel: "taxZones",
    apiUrl: "/api/eCommerce/taxZone",
    method: "PUT",
    nodes: taxZoneCreateFormNodes,
};

export const taxZoneEditFormView: ViewConfig = {
    model: "taxZones",
    viewType: "form",
    viewMode: "edit",
    accessModel: "taxZones",
    apiUrl: "/api/eCommerce/taxZone",
    method: "PATCH",
    nodes: taxZoneEditFormNodes,
};

export const taxZoneViews: ViewConfig[] = [taxZoneSheetView, taxZoneCreateFormView, taxZoneEditFormView];
