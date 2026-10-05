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
                        {render: "#DisplayCard", permissions: {read: "name"}, field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#Tag"}}},
                        {render: "#DisplayCard", permissions: {read: "position"}, field: {name: "position", widget: "#DisplayCard", label: "position", widgetProps: {icon: "#Hash", type: "number"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isVisibleOnProductPage"},
                            field: {
                                name: "isVisibleOnProductPage",
                                widget: "#DisplayCard",
                                label: "isVisibleOnProductPage",
                                widgetProps: {icon: "#IconEye", type: "boolean"},
                            },
                        },
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
                }
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
                        min: 0
                    }
                }
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
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "isVisibleOnProductPage",
                            widget: "#Switch", label: "form.isVisibleOnProductPageLabel"
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "isUsedForVariants",
                            widget: "#Switch",
                            label: "form.isUsedForVariantsLabel"
                        }
                    }
                ],
            },
        ],
    },
];

const productAttributeEditFormNodes: ViewConfig["nodes"] = [
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
                }, permissions: {read: "name", write: "name"}
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
                        min: 0
                    }
                }, permissions: {read: "position", write: "position"}
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
        }, permissions: {read: "values", write: "values"},
    },
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "isVisibleOnProductPage",
                            widget: "#Switch", label: "form.isVisibleOnProductPageLabel"
                        }, permissions: {read: "isVisibleOnProductPage", write: "isVisibleOnProductPage"}
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "isUsedForVariants",
                            widget: "#Switch",
                            label: "form.isUsedForVariantsLabel"
                        }, permissions: {read: "isUsedForVariants", write: "isUsedForVariants"}
                    }
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
