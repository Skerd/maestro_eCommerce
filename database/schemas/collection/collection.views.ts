import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const collectionTypeOptions = [
    {value: "manual", label: "form.collectionType.manual"},
    {value: "dynamic", label: "form.collectionType.dynamic"},
];

const ruleConditionOptions = [
    {value: "all", label: "form.ruleCondition.all"},
    {value: "any", label: "form.ruleCondition.any"},
];

const ruleFieldOptions = [
    {value: "tag", label: "form.ruleField.tag"},
    {value: "brand", label: "form.ruleField.brand"},
    {value: "category", label: "form.ruleField.category"},
    {value: "price", label: "form.ruleField.price"},
    {value: "vendor", label: "form.ruleField.vendor"},
    {value: "inventory_level", label: "form.ruleField.inventory_level"},
    {value: "product_type", label: "form.ruleField.product_type"},
];

const ruleOperatorOptions = [
    {value: "equals", label: "form.ruleOperator.equals"},
    {value: "not_equals", label: "form.ruleOperator.not_equals"},
    {value: "contains", label: "form.ruleOperator.contains"},
    {value: "not_contains", label: "form.ruleOperator.not_contains"},
    {value: "greater_than", label: "form.ruleOperator.greater_than"},
    {value: "less_than", label: "form.ruleOperator.less_than"},
    {value: "starts_with", label: "form.ruleOperator.starts_with"},
];

const collectionFormFields: ViewConfig["nodes"] = [
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
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "slug",
                            widget: "#Input",
                            label: "form.slugLabel",
                            placeholder: "form.slugPlaceholder",
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            required: true,
                            widgetProps: {options: collectionTypeOptions, className: "grow w-full"},
                        },
                    },
                    {render: "#Field", field: {name: "isVisible", widget: "#Checkbox", label: "form.isVisibleLabel"}},
                    {
                        render: "#Field",
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {render: "#Field", field: {name: "publishedAt", widget: "#DateInput", label: "form.publishedAtLabel"}},
                ],
            },
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {rows: 4},
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle"},
        children: [
            {render: "#Field", field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel"}},
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {
            watchField: "type",
            whenValues: ["manual"],
        },
        children: [
            {
                render: "#TitleWithCollapse",
                props: {title: "form.manualSectionTitle", defaultOpen: true},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "products",
                            widget: "#FormObjectIdChips",
                            label: "form.productsLabel",
                            widgetProps: {
                                apiUrl: "/api/eCommerce/product/select",
                                method: "POST",
                                placeholderKey: "form.selectProduct",
                                removeTooltipKey: "form.removeProduct",
                                selectPageSizeCreate: 50,
                                selectPageSizeEdit: 200,
                                labelRefFormExtraKey: "products",
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
            watchField: "type",
            whenValues: ["dynamic"],
        },
        children: [
            {
                render: "#TitleWithCollapse",
                props: {title: "form.dynamicSectionTitle", defaultOpen: true},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "ruleCondition",
                            widget: "#Select",
                            label: "form.ruleConditionLabel",
                            widgetProps: {options: ruleConditionOptions, className: "grow w-full"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "rules",
                            widget: "#FormRepeater",
                            widgetProps: {
                                title: "form.rulesSectionTitle",
                                arrayField: "rules",
                                defaultItem: {field: "tag", operator: "contains", value: ""},
                                addLabel: "form.ruleAddRow",
                                removeLabel: "form.ruleRemoveRow",
                                rowTitleFields: ["field", "value"],
                                rowTitlePlaceholder: "form.ruleRowTitle",
                                rowTemplate: [
                                    {
                                        render: "#FormGrid",
                                        props: {columns: 3},
                                        children: [
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "field",
                                                    widget: "#Select",
                                                    label: "form.ruleFieldLabel",
                                                    required: true,
                                                    widgetProps: {options: ruleFieldOptions, className: "grow w-full"},
                                                },
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "operator",
                                                    widget: "#Select",
                                                    label: "form.ruleOperatorLabel",
                                                    required: true,
                                                    widgetProps: {options: ruleOperatorOptions, className: "grow w-full"},
                                                },
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "value",
                                                    widget: "#Input",
                                                    label: "form.ruleValueLabel",
                                                    placeholder: "form.ruleValuePlaceholder",
                                                    required: true,
                                                },
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.seoSectionTitle"},
        children: [
            {
                render: "#Field",
                field: {
                    name: "seoTitle",
                    widget: "#Input",
                    label: "form.seoTitleLabel",
                    placeholder: "form.seoTitlePlaceholder",
                },
            },
            {
                render: "#Field",
                field: {
                    name: "seoDescription",
                    widget: "#Textarea",
                    label: "form.seoDescriptionLabel",
                    placeholder: "form.seoDescriptionPlaceholder",
                    widgetProps: {rows: 3},
                },
            },
        ],
    },
];

export const collectionSheetView: ViewConfig = {
    model: "productCollections",
    viewType: "sheet",
    accessModel: "productCollections",
    apiUrl: "/api/eCommerce/collection",
    header: {titleField: "name", subtitleKey: "collectionSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#IconTag"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#DisplayCard",
                                label: "type",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "collectionType", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "slug"},
                            field: {name: "slug", widget: "#DisplayCard", label: "slug", widgetProps: {icon: "#IconLink"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isVisible"},
                            field: {
                                name: "isVisible",
                                widget: "#DisplayCard",
                                label: "isVisible",
                                widgetProps: {icon: "#IconEye", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "position"},
                            field: {name: "position", widget: "#DisplayCard", label: "position", widgetProps: {icon: "#Hash"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "productCount"},
                            field: {
                                name: "productCount",
                                widget: "#DisplayCard",
                                label: "productCount",
                                widgetProps: {icon: "#IconBox"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "ruleCondition"},
                            field: {
                                name: "ruleCondition",
                                widget: "#DisplayCard",
                                label: "ruleCondition",
                                widgetProps: {icon: "#IconFilter", languageKeyCategory: "ruleCondition", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "publishedAt"},
                            field: {
                                name: "publishedAt",
                                widget: "#DisplayCard",
                                label: "publishedAt",
                                widgetProps: {icon: "#IconCalendar", format: "dateTime"},
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
            props: {title: "content", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "description"},
                            field: {
                                name: "description",
                                widget: "#DisplayCard",
                                label: "description",
                                widgetProps: {icon: "#IconAlignLeft"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "media", defaultOpen: false},
            dependent: "mainImage",
            permissions: {read: "mainImage"},
            children: [
                {
                    render: "div",
                    props: {className: "max-w-full"},
                    children: [
                        {
                            render: "#GalleryCarousel",
                            permissions: {read: "mainImage"},
                            field: {
                                name: "mainImage",
                                widget: "#GalleryCarousel",
                                label: "mainImage",
                                widgetProps: {
                                    icon: "#IconPhoto",
                                    showThumbnails: false,
                                    allowFullScreen: false,
                                    coverAfterFirst: false,
                                    showPreviews: true,
                                    previewLocation: "right",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "collection.sheet.products.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "products",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "products",
                    permissions: {read: "products"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "products"},
                                    field: {
                                        name: "products",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#ProductCard",
                                            itemDataProp: "product",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconPackage",
                                                label: "product",
                                                valuePath: ["title", "sku"],
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
                storageKey: "collection.sheet.rules.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "rules",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "rules",
                    permissions: {read: "rules"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "rules"},
                                    field: {
                                        name: "rules",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["field", "operator", "value"],
                                            fields: [
                                                {
                                                    name: "field",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    languageKeyCategory: "ruleField",
                                                    labelKey: "ruleFieldLabel",
                                                },
                                                {
                                                    name: "operator",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    languageKeyCategory: "ruleOperator",
                                                    labelKey: "ruleOperatorLabel",
                                                },
                                                {
                                                    name: "value",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "ruleValue",
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
        {
            render: "#SheetGroup",
            props: {title: "seo", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "seoTitle"},
                            field: {
                                name: "seoTitle",
                                widget: "#DisplayCard",
                                label: "seoTitle",
                                widgetProps: {icon: "#IconSeo"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "seoDescription"},
                            field: {
                                name: "seoDescription",
                                widget: "#DisplayCard",
                                label: "seoDescription",
                                widgetProps: {icon: "#IconAlignLeft"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const collectionCreateFormView: ViewConfig = {
    model: "productCollections",
    viewType: "form",
    viewMode: "create",
    accessModel: "productCollections",
    apiUrl: "/api/eCommerce/collection",
    method: "PUT",
    nodes: collectionFormFields,
};

export const collectionEditFormView: ViewConfig = {
    model: "productCollections",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productCollections",
    apiUrl: "/api/eCommerce/collection",
    method: "PATCH",
    nodes: collectionFormFields,
};

export const collectionViews: ViewConfig[] = [collectionSheetView, collectionCreateFormView, collectionEditFormView];
