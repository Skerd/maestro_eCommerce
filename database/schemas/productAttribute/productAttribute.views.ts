import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    PRODUCT_ATTRIBUTE_NAME_MAX,
    PRODUCT_ATTRIBUTE_VALUE_MAX,
    PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const productAttributeSheetView: ViewConfig = {
    model: "productAttributes",
    viewType: "sheet",
    accessModel: "productAttributes",
    apiUrl: "/api/eCommerce/productAttribute",
    header: {titleField: "name", subtitleKey: "productAttributeSubtitle", showCloseButton: true},
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
                            permissions: {read: "isUsedForVariants"},
                            field: {
                                name: "isUsedForVariants",
                                widget: "#DisplayCard",
                                label: "isUsedForVariants",
                                widgetProps: {icon: "#IconStack", type: "boolean"},
                            },
                        },
                    ],
                },
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "values",
                            permissions: {read: "values"},
                            field: {
                                name: "values",
                                widget: "#DisplayCard",
                                label: "values",
                                widgetProps: {icon: "#IconList", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const productAttributeCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle"},
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
                            widgetProps: {maxLength: PRODUCT_ATTRIBUTE_NAME_MAX},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "isUsedForVariants",
                            widget: "#Switch",
                            label: "form.isUsedForVariantsLabel",
                        },
                    },
                ],
            },
            {
                render: "#Field",
                field: {
                    name: "values",
                    widget: "#StringArrayInput",
                    label: "form.valuesLabel",
                    placeholder: "form.valuesPlaceholder",
                    widgetProps: {
                        removeTooltipKey: "form.removeValue",
                        maxItems: PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS,
                        maxLength: PRODUCT_ATTRIBUTE_VALUE_MAX,
                    },
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "isVisibleOnProductPage",
                            widget: "#Switch",
                            label: "form.isVisibleOnProductPageLabel",
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {type: "number", min: 0, step: 1},
                        },
                    },
                ],
            },
        ],
    },
];

const productAttributeEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle"},
        permissions: {readAny: ["name", "isUsedForVariants", "values"], writeAny: ["name", "isUsedForVariants", "values"]},
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
                            widgetProps: {maxLength: PRODUCT_ATTRIBUTE_NAME_MAX},
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "isUsedForVariants", write: "isUsedForVariants"},
                        field: {
                            name: "isUsedForVariants",
                            widget: "#Switch",
                            label: "form.isUsedForVariantsLabel",
                        },
                    },
                ],
            },
            {
                render: "#Field",
                permissions: {read: "values", write: "values"},
                field: {
                    name: "values",
                    widget: "#StringArrayInput",
                    label: "form.valuesLabel",
                    placeholder: "form.valuesPlaceholder",
                    widgetProps: {
                        removeTooltipKey: "form.removeValue",
                        maxItems: PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS,
                        maxLength: PRODUCT_ATTRIBUTE_VALUE_MAX,
                    },
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle"},
        permissions: {readAny: ["isVisibleOnProductPage", "position"], writeAny: ["isVisibleOnProductPage", "position"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "isVisibleOnProductPage", write: "isVisibleOnProductPage"},
                        field: {
                            name: "isVisibleOnProductPage",
                            widget: "#Switch",
                            label: "form.isVisibleOnProductPageLabel",
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "position", write: "position"},
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {type: "number", min: 0, step: 1},
                        },
                    },
                ],
            },
        ],
    },
];

export const productAttributeCreateFormView: ViewConfig = {
    model: "productAttributes",
    viewType: "form",
    viewMode: "create",
    accessModel: "productAttributes",
    apiUrl: "/api/eCommerce/productAttribute",
    method: "PUT",
    nodes: productAttributeCreateFormNodes,
};

export const productAttributeEditFormView: ViewConfig = {
    model: "productAttributes",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productAttributes",
    apiUrl: "/api/eCommerce/productAttribute",
    method: "PATCH",
    nodes: productAttributeEditFormNodes,
};

export const productAttributeViews: ViewConfig[] = [productAttributeSheetView, productAttributeCreateFormView, productAttributeEditFormView];
