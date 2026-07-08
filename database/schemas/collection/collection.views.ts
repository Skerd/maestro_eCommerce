import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

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
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "slug", widget: "#Input", label: "form.slugLabel"}},
            {render: "#Field", field: {name: "type", widget: "#Select", label: "form.typeLabel", required: true, widgetProps: {options: collectionTypeOptions, className: "grow w-full"}}},
            {render: "#Field", field: {name: "isVisible", widget: "#Checkbox", label: "form.isVisibleLabel"}},
            {render: "#Field", field: {name: "position", widget: "#Input", label: "form.positionLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "publishedAt", widget: "#DateInput", label: "form.publishedAtLabel"}},
        ],
    },
    {render: "#Field", field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", widgetProps: {rows: 4}}},
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle"},
        children: [
            {render: "#Field", field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel"}},
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.manualSectionTitle"},
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
    {
        render: "#TitleWithCollapse",
        props: {title: "form.dynamicSectionTitle"},
        children: [
            {render: "#Field", field: {name: "ruleCondition", widget: "#Select", label: "form.ruleConditionLabel", widgetProps: {options: ruleConditionOptions, className: "grow w-full"}}},
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
                                    {render: "#Field", field: {name: "field", widget: "#Select", label: "form.ruleFieldLabel", required: true, widgetProps: {options: ruleFieldOptions, className: "grow w-full"}}},
                                    {render: "#Field", field: {name: "operator", widget: "#Select", label: "form.ruleOperatorLabel", required: true, widgetProps: {options: ruleOperatorOptions, className: "grow w-full"}}},
                                    {render: "#Field", field: {name: "value", widget: "#Input", label: "form.ruleValueLabel", required: true}},
                                ],
                            },
                        ],
                    },
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.seoSectionTitle"},
        children: [
            {render: "#Field", field: {name: "seoTitle", widget: "#Input", label: "form.seoTitleLabel"}},
            {render: "#Field", field: {name: "seoDescription", widget: "#Textarea", label: "form.seoDescriptionLabel", widgetProps: {rows: 3}}},
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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#Tag", languageKeyCategory: "collectionType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "slug"}, field: {name: "slug", widget: "#SmallInfoCard", label: "slug", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isVisible"}, field: {name: "isVisible", widget: "#SmallInfoCard", label: "isVisible", widgetProps: {icon: "#IconEye"}}},
                        {render: "#SmallInfoCard", permissions: {read: "productCount"}, field: {name: "productCount", widget: "#SmallInfoCard", label: "productCount", widgetProps: {icon: "#IconBox"}}},
                        {render: "#SmallInfoCard", permissions: {read: "publishedAt"}, field: {name: "publishedAt", widget: "#SmallInfoCard", label: "publishedAt", widgetProps: {icon: "#IconCalendar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "ruleCondition"}, field: {name: "ruleCondition", widget: "#SmallInfoCard", label: "ruleCondition", widgetProps: {icon: "#IconFilter", languageKeyCategory: "ruleCondition"}}},
                    ],
                },
            ],
        },
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
