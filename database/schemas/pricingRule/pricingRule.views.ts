import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {PRICING_RULE_NAME_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const pricingRuleSheetView: ViewConfig = {
    model: "pricingRules",
    viewType: "sheet",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    header: {titleField: "name", subtitleKey: "pricingRuleSubtitle", showCloseButton: true},
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
                                    icon: "#Tag"
                                }
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#DisplayCard",
                                label: "type",
                                widgetProps: {
                                    icon: "#IconTag",
                                    languageKeyCategory: "pricingRuleType",
                                    type: "enum"
                                },
                            },
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
            props: {title: "offer"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "appliesTo"},
                            field: {
                                name: "appliesTo",
                                widget: "#DisplayCard",
                                label: "appliesTo",
                                widgetProps: {
                                    icon: "#IconTarget",
                                    languageKeyCategory: "pricingRuleAppliesTo",
                                    type: "enum"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "value"},
                            dependent: "hasPercentageValue",
                            dependentRuntimeOnly: true,
                            field: {
                                name: "value",
                                widget: "#DisplayCard",
                                label: "value",
                                widgetProps: {icon: "#Percent", suffix: "%"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "value"},
                            dependent: "hasFixedValue",
                            dependentRuntimeOnly: true,
                            field: {
                                name: "value",
                                widget: "#DisplayCard",
                                label: "value",
                                widgetProps: {icon: "#Banknote", type: "number"},
                            },
                        },
                    ],
                },
                {
                    render: "#ReferencesViewModeScope",
                    props: {
                        storageKey: "pricingRules.sheet.productTargets.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "products",
                                titleActions: "#ReferencesViewModeToggle",
                                // Nested under offer — avoid a second CollapsibleContent (overflow:hidden clips cards).
                                collapsible: false,
                            },
                            dependent: "productTargets",
                            dependentRuntimeOnly: true,
                            permissions: {read: "targetIds"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "targetIds"},
                                            field: {
                                                name: "productTargets",
                                                widget: "#ReferencesRender",
                                                widgetProps: {
                                                    cardWidget: "#ProductCard",
                                                    itemDataProp: "product",
                                                    pageSize: 3,
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconShoppingCart",
                                                        label: "product",
                                                        valuePath: ["title", "name"],
                                                        joinSeparator: " · ",
                                                        linkedSheetModel: "products",
                                                        linkedSheetWidget: "#ProductSheetView",
                                                        linkedSheetEntityProp: "product",
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
                        storageKey: "pricingRules.sheet.collectionTargets.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "collections",
                                titleActions: "#ReferencesViewModeToggle",
                                collapsible: false,
                            },
                            dependent: "collectionTargets",
                            dependentRuntimeOnly: true,
                            permissions: {read: "targetIds"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "targetIds"},
                                            field: {
                                                name: "collectionTargets",
                                                widget: "#ReferencesRender",
                                                widgetProps: {
                                                    cardWidget: "#CollectionCard",
                                                    itemDataProp: "collection",
                                                    pageSize: 3,
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconBox",
                                                        label: "collection",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "collections",
                                                        linkedSheetWidget: "#CollectionSheetView",
                                                        linkedSheetEntityProp: "collection",
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
                        storageKey: "pricingRules.sheet.categoryTargets.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "categories",
                                titleActions: "#ReferencesViewModeToggle",
                                collapsible: false,
                            },
                            dependent: "categoryTargets",
                            dependentRuntimeOnly: true,
                            permissions: {read: "targetIds"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "targetIds"},
                                            field: {
                                                name: "categoryTargets",
                                                widget: "#ReferencesRender",
                                                widgetProps: {
                                                    cardWidget: "#CategoryCard",
                                                    itemDataProp: "category",
                                                    pageSize: 3,
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconCategory2",
                                                        label: "category",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "categories",
                                                        linkedSheetWidget: "#CategorySheetView",
                                                        linkedSheetEntityProp: "category",
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
                    // appliesTo === "customer_group" uses `customerGroups` (not polymorphic targetIds).
                    render: "#ReferencesViewModeScope",
                    props: {
                        storageKey: "pricingRules.sheet.customerGroups.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "customerGroups",
                                titleActions: "#ReferencesViewModeToggle",
                                collapsible: false,
                            },
                            dependent: "customerGroups",
                            permissions: {read: "customerGroups"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "customerGroups"},
                                            field: {
                                                name: "customerGroupRefs",
                                                widget: "#ReferencesRender",
                                                widgetProps: {
                                                    cardWidget: "#CustomerGroupCard",
                                                    itemDataProp: "customerGroup",
                                                    pageSize: 3,
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconUsers",
                                                        label: "customerGroup",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "customerGroups",
                                                        linkedSheetWidget: "#CustomerGroupSheetView",
                                                        linkedSheetEntityProp: "customerGroup",
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
            render: "#SheetGroup",
            props: {title: "schedule"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "startsAt"},
                            field: {
                                name: "startsAt",
                                widget: "#DisplayCard",
                                label: "startsAt",
                                widgetProps: {
                                    icon: "#Calendar",
                                    format: "dateTime"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "endsAt"},
                            field: {
                                name: "endsAt",
                                widget: "#DisplayCard",
                                label: "endsAt",
                                widgetProps: {
                                    icon: "#Calendar",
                                    format: "dateTime"
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "limits"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "minimumOrderAmount"},
                            field: {
                                name: "minimumOrderAmount",
                                widget: "#DisplayCard",
                                label: "minimumOrderAmount",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "minimumQuantity"},
                            field: {
                                name: "minimumQuantity",
                                widget: "#DisplayCard",
                                label: "minimumQuantity",
                                widgetProps: {
                                    icon: "#Hash"
                                },
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const pricingRuleCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "name",
                            widget: "#Input",
                            label: "form.nameLabel",
                            placeholder: "form.namePlaceholder",
                            required: true,
                            widgetProps: {maxLength: PRICING_RULE_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            placeholder: "form.typePlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "percentage_discount", label: "form.pricingRuleType.percentage_discount"},
                                    {value: "fixed_discount", label: "form.pricingRuleType.fixed_discount"},
                                    {value: "fixed_price", label: "form.pricingRuleType.fixed_price"},
                                    {value: "surcharge", label: "form.pricingRuleType.surcharge"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "appliesTo",
                            widget: "#Select",
                            label: "form.appliesToLabel",
                            placeholder: "form.appliesToPlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "all", label: "form.pricingRuleAppliesTo.all"},
                                    {value: "product", label: "form.pricingRuleAppliesTo.product"},
                                    {value: "category", label: "form.pricingRuleAppliesTo.category"},
                                    {value: "collection", label: "form.pricingRuleAppliesTo.collection"},
                                    {value: "customer_group", label: "form.pricingRuleAppliesTo.customer_group"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "value",
                            widget: "#Input",
                            label: "form.valueLabel",
                            placeholder: "form.valuePlaceholder",
                            widgetProps: {type: "number", min: 0},
                            required: true,
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "priority",
                            widget: "#Input",
                            label: "form.priorityLabel",
                            placeholder: "form.priorityPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.scheduleSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            placeholder: "form.startsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "endsAt",
                            widget: "#DateInput",
                            label: "form.endsAtLabel",
                            placeholder: "form.endsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.limitsSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "minimumOrderAmount",
                            widget: "#Input",
                            label: "form.minimumOrderAmountLabel",
                            placeholder: "form.minimumOrderAmountPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "minimumQuantity",
                            widget: "#Input",
                            label: "form.minimumQuantityLabel",
                            placeholder: "form.minimumQuantityPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                ],
            },
        ],
    },
    {
        // Clear targets when leaving product/collection/category (e.g. → all / customer_group).
        // Sibling setFieldsOnMatch clears again when switching between those three.
        render: "#FormWhenFieldValueIn",
        props: {
            watchField: "appliesTo",
            whenValues: ["product", "collection", "category"],
            clearFields: ["targetIds"],
        },
        children: [
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "appliesTo",
                    whenValues: ["product"],
                    setFieldsOnMatch: {targetIds: []},
                },
                children: [
                    {
                        render: "#TitleWithCollapse",
                        props: {title: "form.productsLabel", defaultOpen: true},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "targetIds",
                                    widget: "#ObjectIdChipsInput",
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/product/select",
                                        method: "POST",
                                        placeholderKey: "form.selectProduct",
                                        removeTooltipKey: "form.removeTarget",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "targetIds",
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "appliesTo",
                    whenValues: ["collection"],
                    setFieldsOnMatch: {targetIds: []},
                },
                children: [
                    {
                        render: "#TitleWithCollapse",
                        props: {title: "form.collectionsLabel", defaultOpen: true},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "targetIds",
                                    widget: "#ObjectIdChipsInput",
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/collection/select",
                                        method: "POST",
                                        placeholderKey: "form.selectCollection",
                                        removeTooltipKey: "form.removeTarget",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "targetIds",
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "appliesTo",
                    whenValues: ["category"],
                    setFieldsOnMatch: {targetIds: []},
                },
                children: [
                    {
                        render: "#TitleWithCollapse",
                        props: {title: "form.categoriesLabel", defaultOpen: true},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "targetIds",
                                    widget: "#ObjectIdChipsInput",
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/category/select",
                                        method: "POST",
                                        placeholderKey: "form.selectCategory",
                                        removeTooltipKey: "form.removeTarget",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "targetIds",
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
        render: "#TitleWithCollapse",
        props: {title: "form.customerGroupsSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#Field",
                field: {
                    name: "customerGroups",
                    widget: "#ObjectIdChipsInput",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/customerGroup/select",
                        method: "POST",
                        placeholderKey: "form.selectCustomerGroup",
                        removeTooltipKey: "form.removeCustomerGroup",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "customerGroups",
                    },
                },
            },
        ],
    },
];

const pricingRuleEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["name", "type", "appliesTo", "value", "priority"],
            writeAny: ["name", "type", "appliesTo", "value", "priority"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
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
                            widgetProps: {maxLength: PRICING_RULE_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "type", write: "type"},
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            placeholder: "form.typePlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "percentage_discount", label: "form.pricingRuleType.percentage_discount"},
                                    {value: "fixed_discount", label: "form.pricingRuleType.fixed_discount"},
                                    {value: "fixed_price", label: "form.pricingRuleType.fixed_price"},
                                    {value: "surcharge", label: "form.pricingRuleType.surcharge"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "appliesTo", write: "appliesTo"},
                        field: {
                            name: "appliesTo",
                            widget: "#Select",
                            label: "form.appliesToLabel",
                            placeholder: "form.appliesToPlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "all", label: "form.pricingRuleAppliesTo.all"},
                                    {value: "product", label: "form.pricingRuleAppliesTo.product"},
                                    {value: "category", label: "form.pricingRuleAppliesTo.category"},
                                    {value: "collection", label: "form.pricingRuleAppliesTo.collection"},
                                    {value: "customer_group", label: "form.pricingRuleAppliesTo.customer_group"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "value", write: "value"},
                        field: {
                            name: "value",
                            widget: "#Input",
                            label: "form.valueLabel",
                            placeholder: "form.valuePlaceholder",
                            widgetProps: {type: "number", min: 0},
                            required: true,
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "priority", write: "priority"},
                        field: {
                            name: "priority",
                            widget: "#Input",
                            label: "form.priorityLabel",
                            placeholder: "form.priorityPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.scheduleSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["startsAt", "endsAt"],
            writeAny: ["startsAt", "endsAt"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "startsAt", write: "startsAt"},
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            placeholder: "form.startsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "endsAt", write: "endsAt"},
                        field: {
                            name: "endsAt",
                            widget: "#DateInput",
                            label: "form.endsAtLabel",
                            placeholder: "form.endsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.limitsSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["minimumOrderAmount", "minimumQuantity"],
            writeAny: ["minimumOrderAmount", "minimumQuantity"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "minimumOrderAmount", write: "minimumOrderAmount"},
                        field: {
                            name: "minimumOrderAmount",
                            widget: "#Input",
                            label: "form.minimumOrderAmountLabel",
                            placeholder: "form.minimumOrderAmountPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "minimumQuantity", write: "minimumQuantity"},
                        field: {
                            name: "minimumQuantity",
                            widget: "#Input",
                            label: "form.minimumQuantityLabel",
                            placeholder: "form.minimumQuantityPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                ],
            },
        ],
    },
    {
        // Clear targets when leaving product/collection/category (e.g. → all / customer_group).
        // Sibling setFieldsOnMatch clears again when switching between those three.
        render: "#FormWhenFieldValueIn",
        permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
        props: {
            watchField: "appliesTo",
            whenValues: ["product", "collection", "category"],
            clearFields: ["targetIds"],
        },
        children: [
            {
                render: "#FormWhenFieldValueIn",
                permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
                props: {
                    watchField: "appliesTo",
                    whenValues: ["product"],
                    setFieldsOnMatch: {targetIds: []},
                },
                children: [
                    {
                        render: "#TitleWithCollapse",
                        props: {title: "form.productsLabel", defaultOpen: true},
                        permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
                        children: [
                            {
                                render: "#Field",
                                permissions: {read: "targetIds", write: "targetIds"},
                                field: {
                                    name: "targetIds",
                                    widget: "#ObjectIdChipsInput",
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/product/select",
                                        method: "POST",
                                        placeholderKey: "form.selectProduct",
                                        removeTooltipKey: "form.removeTarget",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "targetIds",
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
                props: {
                    watchField: "appliesTo",
                    whenValues: ["collection"],
                    setFieldsOnMatch: {targetIds: []},
                },
                children: [
                    {
                        render: "#TitleWithCollapse",
                        props: {title: "form.collectionsLabel", defaultOpen: true},
                        permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
                        children: [
                            {
                                render: "#Field",
                                permissions: {read: "targetIds", write: "targetIds"},
                                field: {
                                    name: "targetIds",
                                    widget: "#ObjectIdChipsInput",
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/collection/select",
                                        method: "POST",
                                        placeholderKey: "form.selectCollection",
                                        removeTooltipKey: "form.removeTarget",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "targetIds",
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
                props: {
                    watchField: "appliesTo",
                    whenValues: ["category"],
                    setFieldsOnMatch: {targetIds: []},
                },
                children: [
                    {
                        render: "#TitleWithCollapse",
                        props: {title: "form.categoriesLabel", defaultOpen: true},
                        permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
                        children: [
                            {
                                render: "#Field",
                                permissions: {read: "targetIds", write: "targetIds"},
                                field: {
                                    name: "targetIds",
                                    widget: "#ObjectIdChipsInput",
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/category/select",
                                        method: "POST",
                                        placeholderKey: "form.selectCategory",
                                        removeTooltipKey: "form.removeTarget",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "targetIds",
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
        render: "#TitleWithCollapse",
        props: {title: "form.customerGroupsSectionTitle", defaultOpen: true},
        permissions: {readAny: ["customerGroups"], writeAny: ["customerGroups"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "customerGroups", write: "customerGroups"},
                field: {
                    name: "customerGroups",
                    widget: "#ObjectIdChipsInput",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/customerGroup/select",
                        method: "POST",
                        placeholderKey: "form.selectCustomerGroup",
                        removeTooltipKey: "form.removeCustomerGroup",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "customerGroups",
                    },
                },
            },
        ],
    },
];

export const pricingRuleCreateFormView: ViewConfig = {
    model: "pricingRules",
    viewType: "form",
    viewMode: "create",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    method: "PUT",
    nodes: pricingRuleCreateFormNodes,
};

export const pricingRuleEditFormView: ViewConfig = {
    model: "pricingRules",
    viewType: "form",
    viewMode: "edit",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    method: "PATCH",
    nodes: pricingRuleEditFormNodes,
};

export const pricingRuleViews: ViewConfig[] = [pricingRuleSheetView, pricingRuleCreateFormView, pricingRuleEditFormView];
