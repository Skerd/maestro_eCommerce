import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const discountTypeOptions = [
    {value: "percentage", label: "form.discountType.percentage"},
    {value: "fixed", label: "form.discountType.fixed"},
    {value: "free_shipping", label: "form.discountType.free_shipping"},
    {value: "buy_x_get_y", label: "form.discountType.buy_x_get_y"},
];

const discountAppliesToOptions = [
    {value: "order", label: "form.discountAppliesTo.order"},
    {value: "product", label: "form.discountAppliesTo.product"},
    {value: "collection", label: "form.discountAppliesTo.collection"},
    {value: "category", label: "form.discountAppliesTo.category"},
];

const discountFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "title", widget: "#Input", label: "form.titleLabel", placeholder: "form.titlePlaceholder", required: true}},
                    {render: "#Field", field: {name: "code", widget: "#Input", label: "form.codeLabel", placeholder: "form.codePlaceholder"}},
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            required: true,
                            widgetProps: {options: discountTypeOptions, className: "grow w-full"},
                        },
                    },
                    {
                        render: "#FormWhenFieldValueIn",
                        props: {
                            watchField: "type",
                            whenValues: ["percentage", "fixed", "free_shipping"],
                        },
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "appliesTo",
                                    widget: "#Select",
                                    label: "form.appliesToLabel",
                                    required: true,
                                    widgetProps: {options: discountAppliesToOptions, className: "grow w-full"},
                                },
                            },
                        ],
                    },
                    {
                        render: "#FormWhenFieldValueIn",
                        props: {
                            watchField: "type",
                            whenValues: ["percentage", "fixed"],
                            clearFields: ["value"],
                            clearFieldValues: {value: 0},
                        },
                        children: [
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
                        ],
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
                            required: true,
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
                    {render: "#Field", field: {name: "minimumOrderAmount", widget: "#Input", label: "form.minimumOrderAmountLabel", placeholder: "form.minimumOrderAmountPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "minimumQuantity", widget: "#Input", label: "form.minimumQuantityLabel", placeholder: "form.minimumQuantityPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "usageLimit", widget: "#Input", label: "form.usageLimitLabel", placeholder: "form.usageLimitPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "usageLimitPerCustomer", widget: "#Input", label: "form.usageLimitPerCustomerLabel", placeholder: "form.usageLimitPerCustomerPlaceholder", widgetProps: {type: "number", min: 0}}},
                ],
            },
        ],
    },
    {
        // Targets only for non-BXGY (BXGY eligibility lives under buyXGetY.getProductIds).
        render: "#FormWhenFieldValueIn",
        props: {
            watchField: "type",
            whenValues: ["percentage", "fixed", "free_shipping"],
        },
        children: [
            {
                // Clear targets when leaving product/collection/category (e.g. → order).
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
    {
        render: "#FormWhenFieldValueIn",
        props: {
            watchField: "type",
            whenValues: ["buy_x_get_y"],
            clearFields: ["buyXGetY"],
            setFieldsOnMatch: {appliesTo: "product", value: 0, targetIds: []},
        },
        children: [
            {
                render: "#TitleWithCollapse",
                props: {title: "form.buyXGetYSectionTitle", defaultOpen: true},
                children: [
                    {
                        render: "#FormAlert",
                        props: {message: "form.buyXGetYAnyOfSetHint"},
                    },
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "buyXGetY.buyQuantity",
                                    widget: "#Input",
                                    label: "form.buyQuantityLabel",
                                    placeholder: "form.buyQuantityPlaceholder",
                                    widgetProps: {type: "number", min: 1},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "buyXGetY.getQuantity",
                                    widget: "#Input",
                                    label: "form.getQuantityLabel",
                                    placeholder: "form.getQuantityPlaceholder",
                                    widgetProps: {type: "number", min: 1},
                                },
                            },
                        ],
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "buyXGetY.getProductIds",
                            widget: "#FormObjectIdChips",
                            label: "form.getProductIdsLabel",
                            widgetProps: {
                                apiUrl: "/api/eCommerce/product/select",
                                method: "POST",
                                placeholderKey: "form.selectProduct",
                                removeTooltipKey: "form.removeProduct",
                                selectPageSizeCreate: 50,
                                selectPageSizeEdit: 200,
                                labelRefFormExtraKey: "buyXGetY.getProductIds",
                            },
                        },
                    },
                ],
            },
        ],
    },
];

export const discountSheetView: ViewConfig = {
    model: "discounts",
    viewType: "sheet",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    header: {titleField: "title", subtitleKey: "discountSubtitle", showCloseButton: true},
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
                            permissions: {read: "title"},
                            field: {name: "title", widget: "#SmallInfoCard", label: "title", widgetProps: {icon: "#Tag"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "code"},
                            field: {name: "code", widget: "#SmallInfoCard", label: "code", widgetProps: {icon: "#IconTag"}},
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#SmallInfoCard",
                                label: "type",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "discountType"},
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
            // Hidden for BXGY (eligibility is under buyXGetY; appliesTo/value are forced product/0).
            render: "#SheetGroup",
            props: {title: "offer"},
            dependent: "hasOfferScoping",
            dependentRuntimeOnly: true,
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
                                widgetProps: {icon: "#IconTarget", languageKeyCategory: "discountAppliesTo"},
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
                            permissions: {read: "usageCount"},
                            field: {
                                name: "usageCount",
                                widget: "#SmallInfoCard",
                                label: "usageCount",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "usageLimit"},
                            field: {
                                name: "usageLimit",
                                widget: "#SmallInfoCard",
                                label: "usageLimit",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "usageLimitPerCustomer"},
                            field: {
                                name: "usageLimitPerCustomer",
                                widget: "#SmallInfoCard",
                                label: "usageLimitPerCustomer",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
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
                storageKey: "discounts.sheet.productTargets.listDisplay",
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
                storageKey: "discounts.sheet.collectionTargets.listDisplay",
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
                storageKey: "discounts.sheet.categoryTargets.listDisplay",
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
                storageKey: "discounts.sheet.customerGroups.listDisplay",
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
        {
            render: "#SheetGroup",
            props: {title: "buyXGetY"},
            dependent: "buyXGetY",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "buyXGetY"},
                            field: {
                                name: "buyXGetY.buyQuantity",
                                widget: "#SmallInfoCard",
                                label: "buyQuantity",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "buyXGetY"},
                            field: {
                                name: "buyXGetY.getQuantity",
                                widget: "#SmallInfoCard",
                                label: "getQuantity",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                    ],
                },
                {
                    render: "#ReferencesViewModeScope",
                    props: {
                        storageKey: "discounts.sheet.buyXGetYProducts.listDisplay",
                        defaultMode: "compact",
                    },
                    children: [
                        {
                            render: "#SheetGroup",
                            props: {
                                title: "eligibleProducts",
                                titleActions: "#ReferencesViewModeToggle",
                            },
                            dependent: "buyXGetY.getProducts",
                            dependentRuntimeOnly: true,
                            permissions: {read: "buyXGetY"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                                    children: [
                                        {
                                            render: "#ReferencesRender",
                                            permissions: {read: "buyXGetY"},
                                            field: {
                                                name: "buyXGetY.getProducts",
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
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const discountCreateFormView: ViewConfig = {
    model: "discounts",
    viewType: "form",
    viewMode: "create",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    method: "PUT",
    nodes: discountFormFields,
};

export const discountEditFormView: ViewConfig = {
    model: "discounts",
    viewType: "form",
    viewMode: "edit",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    method: "PATCH",
    nodes: discountFormFields,
};

export const discountViews: ViewConfig[] = [discountSheetView, discountCreateFormView, discountEditFormView];
