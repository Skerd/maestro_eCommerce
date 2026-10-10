import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    DISCOUNT_CODE_MAX,
    DISCOUNT_TITLE_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                            render: "#DisplayCard",
                            permissions: {read: "title"},
                            field: {name: "title", widget: "#DisplayCard", label: "title", widgetProps: {icon: "#Tag"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "code"},
                            field: {name: "code", widget: "#DisplayCard", label: "code", widgetProps: {icon: "#IconTag"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#DisplayCard",
                                label: "type",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "discountType", type: "enum"},
                            },
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
                        }
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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "appliesTo"},
                            field: {
                                name: "appliesTo",
                                widget: "#DisplayCard",
                                label: "appliesTo",
                                widgetProps: {icon: "#IconTarget", languageKeyCategory: "discountAppliesTo", type: "enum"},
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
                        storageKey: "discounts.sheet.productTargets.listDisplay",
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
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconBox",
                                                        label: "collection",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "productCollections",
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
                                                    hideActions: true,
                                                    compactRow: {
                                                        icon: "#IconCategory2",
                                                        label: "category",
                                                        valuePath: ["name"],
                                                        linkedSheetModel: "productcategories",
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
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "schedule"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "startsAt"},
                            field: {
                                name: "startsAt",
                                widget: "#DisplayCard",
                                label: "startsAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "endsAt"},
                            field: {
                                name: "endsAt",
                                widget: "#DisplayCard",
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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "usageCount"},
                            field: {
                                name: "usageCount",
                                widget: "#DisplayCard",
                                label: "usageCount",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "usageLimit"},
                            field: {
                                name: "usageLimit",
                                widget: "#DisplayCard",
                                label: "usageLimit",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "usageLimitPerCustomer"},
                            field: {
                                name: "usageLimitPerCustomer",
                                widget: "#DisplayCard",
                                label: "usageLimitPerCustomer",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "minimumOrderAmount"},
                            field: {
                                name: "minimumOrderAmount",
                                widget: "#DisplayCard",
                                label: "minimumOrderAmount",
                                widgetProps: {icon: "#IconCurrencyDollar"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "minimumQuantity"},
                            field: {
                                name: "minimumQuantity",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            permissions: {read: "buyXGetY"},
                            field: {
                                name: "buyXGetY.buyQuantity",
                                widget: "#DisplayCard",
                                label: "buyQuantity",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "buyXGetY"},
                            field: {
                                name: "buyXGetY.getQuantity",
                                widget: "#DisplayCard",
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
                                collapsible: false,
                            },
                            dependent: "buyXGetY.getProducts",
                            dependentRuntimeOnly: true,
                            permissions: {read: "buyXGetY"},
                            children: [
                                {
                                    render: "div",
                                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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

const discountCreateFormNodes: ViewConfig["nodes"] = [
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
                            name: "title",
                            widget: "#Input",
                            label: "form.titleLabel",
                            placeholder: "form.titlePlaceholder",
                            required: true,
                            widgetProps: {maxLength: DISCOUNT_TITLE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "code",
                            widget: "#Input",
                            label: "form.codeLabel",
                            placeholder: "form.codePlaceholder",
                            widgetProps: {maxLength: DISCOUNT_CODE_MAX},
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
                                    {value: "percentage", label: "form.discountType.percentage"},
                                    {value: "fixed", label: "form.discountType.fixed"},
                                    {value: "free_shipping", label: "form.discountType.free_shipping"},
                                    {value: "buy_x_get_y", label: "form.discountType.buy_x_get_y"},
                                ],
                                className: "grow w-full"
                            },
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
                                    placeholder: "form.appliesToPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        options: [
                                            {value: "order", label: "form.discountAppliesTo.order"},
                                            {value: "product", label: "form.discountAppliesTo.product"},
                                            {value: "collection", label: "form.discountAppliesTo.collection"},
                                            {value: "category", label: "form.discountAppliesTo.category"},
                                        ],
                                        className: "grow w-full"
                                    },
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
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            placeholder: "form.startsAtPlaceholder",
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
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "minimumQuantity",
                            widget: "#Input",
                            label: "form.minimumQuantityLabel",
                            placeholder: "form.minimumQuantityPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "usageLimit",
                            widget: "#Input",
                            label: "form.usageLimitLabel",
                            placeholder: "form.usageLimitPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "usageLimitPerCustomer",
                            widget: "#Input",
                            label: "form.usageLimitPerCustomerLabel",
                            placeholder: "form.usageLimitPerCustomerPlaceholder",
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
                            widget: "#ObjectIdChipsInput",
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

const discountEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["title", "code", "type", "appliesTo", "value"],
            writeAny: ["title", "code", "type", "appliesTo", "value"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "title", write: "title"},
                        field: {
                            name: "title",
                            widget: "#Input",
                            label: "form.titleLabel",
                            placeholder: "form.titlePlaceholder",
                            required: true,
                            widgetProps: {maxLength: DISCOUNT_TITLE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "code", write: "code"},
                        field: {
                            name: "code",
                            widget: "#Input",
                            label: "form.codeLabel",
                            placeholder: "form.codePlaceholder",
                            widgetProps: {maxLength: DISCOUNT_CODE_MAX},
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
                                    {value: "percentage", label: "form.discountType.percentage"},
                                    {value: "fixed", label: "form.discountType.fixed"},
                                    {value: "free_shipping", label: "form.discountType.free_shipping"},
                                    {value: "buy_x_get_y", label: "form.discountType.buy_x_get_y"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                    {
                        render: "#FormWhenFieldValueIn",
                        permissions: {readAny: ["appliesTo"], writeAny: ["appliesTo"]},
                        props: {
                            watchField: "type",
                            whenValues: ["percentage", "fixed", "free_shipping"],
                        },
                        children: [
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
                                            {value: "order", label: "form.discountAppliesTo.order"},
                                            {value: "product", label: "form.discountAppliesTo.product"},
                                            {value: "collection", label: "form.discountAppliesTo.collection"},
                                            {value: "category", label: "form.discountAppliesTo.category"},
                                        ],
                                        className: "grow w-full"
                                    },
                                },
                            },
                        ],
                    },
                    {
                        render: "#FormWhenFieldValueIn",
                        permissions: {readAny: ["value"], writeAny: ["value"]},
                        props: {
                            watchField: "type",
                            whenValues: ["percentage", "fixed"],
                            clearFields: ["value"],
                            clearFieldValues: {value: 0},
                        },
                        children: [
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
                        ],
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
                            required: true,
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
            readAny: ["minimumOrderAmount", "minimumQuantity", "usageLimit", "usageLimitPerCustomer"],
            writeAny: ["minimumOrderAmount", "minimumQuantity", "usageLimit", "usageLimitPerCustomer"],
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
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "minimumQuantity", write: "minimumQuantity"},
                        field: {
                            name: "minimumQuantity",
                            widget: "#Input",
                            label: "form.minimumQuantityLabel",
                            placeholder: "form.minimumQuantityPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "usageLimit", write: "usageLimit"},
                        field: {
                            name: "usageLimit",
                            widget: "#Input",
                            label: "form.usageLimitLabel",
                            placeholder: "form.usageLimitPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0
                            }
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "usageLimitPerCustomer", write: "usageLimitPerCustomer"},
                        field: {
                            name: "usageLimitPerCustomer",
                            widget: "#Input",
                            label: "form.usageLimitPerCustomerLabel",
                            placeholder: "form.usageLimitPerCustomerPlaceholder",
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
        // Targets only for non-BXGY (BXGY eligibility lives under buyXGetY.getProductIds).
        render: "#FormWhenFieldValueIn",
        permissions: {readAny: ["targetIds"], writeAny: ["targetIds"]},
        props: {
            watchField: "type",
            whenValues: ["percentage", "fixed", "free_shipping"],
        },
        children: [
            {
                // Clear targets when leaving product/collection/category (e.g. → order).
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
    {
        render: "#FormWhenFieldValueIn",
        permissions: {readAny: ["buyXGetY"], writeAny: ["buyXGetY"]},
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
                permissions: {readAny: ["buyXGetY"], writeAny: ["buyXGetY"]},
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
                                permissions: {read: "buyXGetY", write: "buyXGetY"},
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
                                permissions: {read: "buyXGetY", write: "buyXGetY"},
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
                        permissions: {read: "buyXGetY", write: "buyXGetY"},
                        field: {
                            name: "buyXGetY.getProductIds",
                            widget: "#ObjectIdChipsInput",
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

export const discountCreateFormView: ViewConfig = {
    model: "discounts",
    viewType: "form",
    viewMode: "create",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    method: "PUT",
    nodes: discountCreateFormNodes,
};

export const discountEditFormView: ViewConfig = {
    model: "discounts",
    viewType: "form",
    viewMode: "edit",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    method: "PATCH",
    nodes: discountEditFormNodes,
};

export const discountViews: ViewConfig[] = [discountSheetView, discountCreateFormView, discountEditFormView];
