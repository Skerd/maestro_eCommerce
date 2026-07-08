import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const productAttributeFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "position", widget: "#Input", label: "form.positionLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "isVisibleOnProductPage", widget: "#Checkbox", label: "form.isVisibleOnProductPageLabel"}},
            {render: "#Field", field: {name: "isUsedForVariants", widget: "#Checkbox", label: "form.isUsedForVariantsLabel"}},
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
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#Tag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "position"}, field: {name: "position", widget: "#SmallInfoCard", label: "position", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isVisibleOnProductPage"}, field: {name: "isVisibleOnProductPage", widget: "#SmallInfoCard", label: "isVisibleOnProductPage", widgetProps: {icon: "#IconEye"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isUsedForVariants"}, field: {name: "isUsedForVariants", widget: "#SmallInfoCard", label: "isUsedForVariants", widgetProps: {icon: "#IconLayers"}}},
                        {render: "#SmallInfoCard", permissions: {read: "values"}, field: {name: "valueCount", widget: "#SmallInfoCard", label: "valueCount", widgetProps: {icon: "#IconList"}}},
                    ],
                },
            ],
        },
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
