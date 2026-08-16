import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const productAttributeFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "position", widget: "#Input", label: "form.positionLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "isVisibleOnProductPage", widget: "#Switch", label: "form.isVisibleOnProductPageLabel"}},
            {render: "#Field", field: {name: "isUsedForVariants", widget: "#Switch", label: "form.isUsedForVariantsLabel"}},
        ],
    },
    {
        render: "#Field",
        field: {
            name: "values",
            widget: "#StringArrayField",
            label: "form.valuesLabel",
            placeholder: "form.valuesPlaceholder",
            widgetProps: {removeTooltipKey: "form.removeValue"},
        },
    },
];

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

export const productAttributeCreateFormView: ViewConfig = {
    model: "productAttributes",
    viewType: "form",
    viewMode: "create",
    accessModel: "productAttributes",
    apiUrl: "/api/eCommerce/productAttribute",
    method: "PUT",
    nodes: productAttributeFormFields,
};

export const productAttributeEditFormView: ViewConfig = {
    model: "productAttributes",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productAttributes",
    apiUrl: "/api/eCommerce/productAttribute",
    method: "PATCH",
    nodes: productAttributeFormFields,
};

export const productAttributeViews: ViewConfig[] = [productAttributeSheetView, productAttributeCreateFormView, productAttributeEditFormView];
