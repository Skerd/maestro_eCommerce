import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const pricingRuleTypeOptions = [
    {value: "percentage_discount", label: "form.pricingRuleType.percentage_discount"},
    {value: "fixed_discount", label: "form.pricingRuleType.fixed_discount"},
    {value: "fixed_price", label: "form.pricingRuleType.fixed_price"},
    {value: "surcharge", label: "form.pricingRuleType.surcharge"},
];

const pricingRuleAppliesToOptions = [
    {value: "all", label: "form.pricingRuleAppliesTo.all"},
    {value: "product", label: "form.pricingRuleAppliesTo.product"},
    {value: "category", label: "form.pricingRuleAppliesTo.category"},
    {value: "collection", label: "form.pricingRuleAppliesTo.collection"},
    {value: "customer_group", label: "form.pricingRuleAppliesTo.customer_group"},
];

const pricingRuleFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", placeholder: "form.namePlaceholder", required: true}},
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            required: true,
                            widgetProps: {options: pricingRuleTypeOptions, className: "grow w-full"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "appliesTo",
                            widget: "#Select",
                            label: "form.appliesToLabel",
                            required: true,
                            widgetProps: {options: pricingRuleAppliesToOptions, className: "grow w-full"},
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
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "endsAt",
                            widget: "#DateInput",
                            label: "form.endsAtLabel",
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
                props: {columns: 2},
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
                                    widget: "#FormObjectIdChips",
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
                                    widget: "#FormObjectIdChips",
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
                                    widget: "#FormObjectIdChips",
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
                    widget: "#FormObjectIdChips",
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
                            render: "#SmallInfoCard",
                            permissions: {read: "name"},
                            field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#Tag"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#SmallInfoCard",
                                label: "type",
                                widgetProps: {icon: "#IconTag", languageKeyCategory: "pricingRuleType"},
                            },
                        },
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
                            render: "#SmallInfoCard",
                            permissions: {read: "appliesTo"},
                            field: {
                                name: "appliesTo",
                                widget: "#SmallInfoCard",
                                label: "appliesTo",
                                widgetProps: {icon: "#IconTarget", languageKeyCategory: "pricingRuleAppliesTo"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "value"},
                            field: {
                                name: "value",
                                widget: "#SmallInfoCard",
                                label: "value",
                                widgetProps: {icon: "#IconPercent"},
                            },
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
                            render: "#SmallInfoCard",
                            permissions: {read: "startsAt"},
                            field: {
                                name: "startsAt",
                                widget: "#SmallInfoCard",
                                label: "startsAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "endsAt"},
                            field: {
                                name: "endsAt",
                                widget: "#SmallInfoCard",
                                label: "endsAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
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
                            render: "#SmallInfoCard",
                            permissions: {read: "minimumOrderAmount"},
                            field: {
                                name: "minimumOrderAmount",
                                widget: "#SmallInfoCard",
                                label: "minimumOrderAmount",
                                widgetProps: {icon: "#IconCurrencyDollar"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "minimumQuantity"},
                            field: {
                                name: "minimumQuantity",
                                widget: "#SmallInfoCard",
                                label: "minimumQuantity",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                    ],
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
                    },
                    dependent: "productTargets",
                    dependentRuntimeOnly: true,
                    permissions: {read: "targetIds"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
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
                    },
                    dependent: "collectionTargets",
                    dependentRuntimeOnly: true,
                    permissions: {read: "targetIds"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
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
                    },
                    dependent: "categoryTargets",
                    dependentRuntimeOnly: true,
                    permissions: {read: "targetIds"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
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
                    },
                    dependent: "customerGroups",
                    permissions: {read: "customerGroups"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
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
        lifecycleSheetGroup,
    ],
};

export const pricingRuleCreateFormView: ViewConfig = {
    model: "pricingRules",
    viewType: "form",
    viewMode: "create",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    method: "PUT",
    nodes: pricingRuleFormFields,
};

export const pricingRuleEditFormView: ViewConfig = {
    model: "pricingRules",
    viewType: "form",
    viewMode: "edit",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    method: "PATCH",
    nodes: pricingRuleFormFields,
};

export const pricingRuleViews: ViewConfig[] = [pricingRuleSheetView, pricingRuleCreateFormView, pricingRuleEditFormView];
