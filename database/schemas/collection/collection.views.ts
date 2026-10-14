import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    COLLECTION_NAME_MAX,
    COLLECTION_DESCRIPTION_MAX,
    COLLECTION_SEO_TITLE_MAX,
    COLLECTION_SEO_DESCRIPTION_MAX,
    COLLECTION_RULE_VALUE_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
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

export const collectionSheetView: ViewConfig = {
    model: "productCollections",
    viewType: "sheet",
    accessModel: "productCollections",
    apiUrl: "/api/eCommerce/collection",
    header: {
        titleField: "name",
        subtitleKey: "collectionSubtitle",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: {
                title: "overview",
                defaultOpen: true,
            },
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
                                widgetProps: {icon: "#IconTag"},
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
                                    icon: "#Tag",
                                    languageKeyCategory: "collectionType",
                                    type: "enum",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "slug"},
                            field: {
                                name: "slug",
                                widget: "#DisplayCard",
                                label: "slug",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isVisible"},
                            field: {
                                name: "isVisible",
                                widget: "#DisplayCard",
                                label: "isVisible",
                                widgetProps: {
                                    icon: "#IconEye",
                                    type: "boolean",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "position"},
                            field: {
                                name: "position",
                                widget: "#DisplayCard",
                                label: "position",
                                widgetProps: {
                                    icon: "#Hash",
                                    type: "number",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "products"},
                            dependent: "productCount",
                            dependentRuntimeOnly: true,
                            field: {
                                name: "productCount",
                                widget: "#DisplayCard",
                                label: "productCount",
                                widgetProps: {
                                    icon: "#IconPackage",
                                    type: "number",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {
                title: "content",
                defaultOpen: false,
            },
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
                                widgetProps: {
                                    icon: "#IconAlignLeft",
                                    expandable: true,
                                    maxLength: 250,
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {
                title: "media",
                defaultOpen: false,
            },
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
                watchField: "type",
                whenValues: ["manual"],
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
                defaultMode: "compact",
                watchField: "type",
                whenValues: ["dynamic"],
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "rules",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    permissions: {
                        readAny: ["ruleCondition", "rules"],
                    },
                    children: [
                        {
                            render: "#SheetGrid",
                            props: {columns: 1},
                            children: [
                                {
                                    render: "#DisplayCard",
                                    permissions: {read: "ruleCondition"},
                                    field: {
                                        name: "ruleCondition",
                                        widget: "#DisplayCard",
                                        label: "ruleConditionLabel",
                                        widgetProps: {
                                            icon: "#IconFilter",
                                            languageKeyCategory: "ruleCondition",
                                            type: "enum",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            dependent: "rules",
                            permissions: {read: "rules"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "rules"},
                                    field: {
                                        name: "rules",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            entityCards: true,
                                            columns: 2,
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
            props: {
                title: "seo",
                defaultOpen: false,
            },
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

const collectionCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {
            title: "form.generalSectionTitle",
            defaultOpen: true,
        },
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
                            widgetProps: {maxLength: COLLECTION_NAME_MAX},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            required: true,
                            widgetProps: {
                                options: collectionTypeOptions,
                                className: "grow w-full",
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0,
                            },
                        },
                    },
                ],
            },
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {
                        rows: 4,
                        maxLength: COLLECTION_DESCRIPTION_MAX,
                    },
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle"},
        children: [
            {
                render: "#Field",
                field: {
                    name: "mainImage",
                    widget: "#MediaField",
                    label: "form.mainImageLabel",
                },
            },
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
                props: {
                    title: "form.manualSectionTitle",
                    defaultOpen: true,
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "products",
                            widget: "#ObjectIdChipsInput",
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
            clearFields: ["ruleCondition", "rules"],
            setFieldsOnMatch: {
                ruleCondition: "all",
                rules: [{field: "tag", operator: "contains", value: ""}],
            },
        },
        children: [
            {
                render: "#TitleWithCollapse",
                props: {
                    title: "form.dynamicSectionTitle",
                    defaultOpen: true,
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "ruleCondition",
                            widget: "#Select",
                            label: "form.ruleConditionLabel",
                            widgetProps: {
                                options: ruleConditionOptions,
                                className: "grow w-full",
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "rules",
                            widget: "#FormRepeater",
                            required: true,
                            widgetProps: {
                                title: "form.rulesSectionTitle",
                                arrayField: "rules",
                                defaultItem: {
                                    field: "tag",
                                    operator: "contains",
                                    value: "",
                                },
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
                                                    widgetProps: {
                                                        options: ruleFieldOptions,
                                                        className: "grow w-full",
                                                    },
                                                },
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "operator",
                                                    widget: "#Select",
                                                    label: "form.ruleOperatorLabel",
                                                    required: true,
                                                    widgetProps: {
                                                        options: ruleOperatorOptions,
                                                        className: "grow w-full",
                                                    },
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
                                                    widgetProps: {
                                                        maxLength: COLLECTION_RULE_VALUE_MAX,
                                                    },
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
                    widgetProps: {maxLength: COLLECTION_SEO_TITLE_MAX},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "seoDescription",
                    widget: "#Textarea",
                    label: "form.seoDescriptionLabel",
                    placeholder: "form.seoDescriptionPlaceholder",
                    widgetProps: {
                        rows: 3,
                        maxLength: COLLECTION_SEO_DESCRIPTION_MAX,
                    },
                },
            },
        ],
    },
];

const collectionEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {
            title: "form.generalSectionTitle",
            defaultOpen: true,
        },
        permissions: {
            writeAny: ["name", "type", "position", "description"],
        },
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
                            widgetProps: {maxLength: COLLECTION_NAME_MAX},
                        },
                        permissions: {read: "name", write: "name"},
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            required: true,
                            widgetProps: {
                                options: collectionTypeOptions,
                                className: "grow w-full",
                            },
                        },
                        permissions: {read: "type", write: "type"},
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {
                                type: "number",
                                min: 0,
                            },
                        },
                        permissions: {read: "position", write: "position"},
                    },
                ],
            },
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {
                        rows: 4,
                        maxLength: COLLECTION_DESCRIPTION_MAX,
                    },
                },
                permissions: {read: "description", write: "description"},
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle"},
        permissions: {writeAny: ["mainImage"]},
        children: [
            {
                render: "#Field",
                field: {
                    name: "mainImage",
                    widget: "#MediaField",
                    label: "form.mainImageLabel",
                },
                permissions: {read: "mainImage", write: "mainImage"},
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        permissions: {
            readAny: ["products"],
            writeAny: ["products"],
        },
        props: {
            watchField: "type",
            whenValues: ["manual"],
        },
        children: [
            {
                render: "#TitleWithCollapse",
                props: {
                    title: "form.manualSectionTitle",
                    defaultOpen: true,
                },
                permissions: {writeAny: ["products"]},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "products",
                            widget: "#ObjectIdChipsInput",
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
                        permissions: {read: "products", write: "products"},
                    },
                ],
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        permissions: {
            readAny: ["ruleCondition", "rules"],
            writeAny: ["ruleCondition", "rules"],
        },
        props: {
            watchField: "type",
            whenValues: ["dynamic"],
            clearFields: ["ruleCondition", "rules"],
            setFieldsOnMatch: {
                ruleCondition: "all",
                rules: [{field: "tag", operator: "contains", value: ""}],
            },
        },
        children: [
            {
                render: "#TitleWithCollapse",
                props: {
                    title: "form.dynamicSectionTitle",
                    defaultOpen: true,
                },
                permissions: {writeAny: ["ruleCondition", "rules"]},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "ruleCondition",
                            widget: "#Select",
                            label: "form.ruleConditionLabel",
                            widgetProps: {
                                options: ruleConditionOptions,
                                className: "grow w-full",
                            },
                        },
                        permissions: {read: "ruleCondition", write: "ruleCondition"},
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "rules",
                            widget: "#FormRepeater",
                            required: true,
                            widgetProps: {
                                title: "form.rulesSectionTitle",
                                arrayField: "rules",
                                defaultItem: {
                                    field: "tag",
                                    operator: "contains",
                                    value: "",
                                },
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
                                                    widgetProps: {
                                                        options: ruleFieldOptions,
                                                        className: "grow w-full",
                                                    },
                                                },
                                                permissions: {read: "rules", write: "rules"},
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "operator",
                                                    widget: "#Select",
                                                    label: "form.ruleOperatorLabel",
                                                    required: true,
                                                    widgetProps: {
                                                        options: ruleOperatorOptions,
                                                        className: "grow w-full",
                                                    },
                                                },
                                                permissions: {read: "rules", write: "rules"},
                                            },
                                            {
                                                render: "#Field",
                                                field: {
                                                    name: "value",
                                                    widget: "#Input",
                                                    label: "form.ruleValueLabel",
                                                    placeholder: "form.ruleValuePlaceholder",
                                                    required: true,
                                                    widgetProps: {
                                                        maxLength: COLLECTION_RULE_VALUE_MAX,
                                                    },
                                                },
                                                permissions: {read: "rules", write: "rules"},
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                        permissions: {read: "rules", write: "rules"},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.seoSectionTitle"},
        permissions: {writeAny: ["seoTitle", "seoDescription"]},
        children: [
            {
                render: "#Field",
                field: {
                    name: "seoTitle",
                    widget: "#Input",
                    label: "form.seoTitleLabel",
                    placeholder: "form.seoTitlePlaceholder",
                    widgetProps: {maxLength: COLLECTION_SEO_TITLE_MAX},
                },
                permissions: {read: "seoTitle", write: "seoTitle"},
            },
            {
                render: "#Field",
                field: {
                    name: "seoDescription",
                    widget: "#Textarea",
                    label: "form.seoDescriptionLabel",
                    placeholder: "form.seoDescriptionPlaceholder",
                    widgetProps: {
                        rows: 3,
                        maxLength: COLLECTION_SEO_DESCRIPTION_MAX,
                    },
                },
                permissions: {read: "seoDescription", write: "seoDescription"},
            },
        ],
    },
];

export const collectionCreateFormView: ViewConfig = {
    model: "productCollections",
    viewType: "form",
    viewMode: "create",
    accessModel: "productCollections",
    apiUrl: "/api/eCommerce/collection",
    method: "PUT",
    nodes: collectionCreateFormNodes,
};

export const collectionEditFormView: ViewConfig = {
    model: "productCollections",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productCollections",
    apiUrl: "/api/eCommerce/collection",
    method: "PATCH",
    nodes: collectionEditFormNodes,
};

export const collectionViews: ViewConfig[] = [
    collectionSheetView,
    collectionCreateFormView,
    collectionEditFormView,
];
