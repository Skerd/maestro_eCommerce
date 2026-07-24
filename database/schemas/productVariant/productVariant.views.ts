import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const productVariantStatusOptions = [
    {value: "active", label: "form.variantStatus.active"},
    {value: "inactive", label: "form.variantStatus.inactive"},
];

const productVariantFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "product",
                    widget: "#ApiSelect",
                    label: "form.productLabel",
                    placeholder: "form.productPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerce/product/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "status",
                    widget: "#Select",
                    label: "form.statusLabel",
                    widgetProps: {options: productVariantStatusOptions, className: "grow w-full"},
                },
            },
            {render: "#Field", field: {name: "sku", widget: "#Input", label: "form.skuLabel"}},
            {render: "#Field", field: {name: "barcode", widget: "#Input", label: "form.barcodeLabel"}},
            {render: "#Field", field: {name: "price", widget: "#Input", label: "form.priceLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "compareAtPrice", widget: "#Input", label: "form.compareAtPriceLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "costPrice", widget: "#Input", label: "form.costPriceLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "weight", widget: "#Input", label: "form.weightLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "position", widget: "#Input", label: "form.positionLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "trackInventory", widget: "#Checkbox", label: "form.trackInventoryLabel"}},
        ],
    },
    {
        render: "#Field",
        field: {
            name: "attributeCombination",
            widget: "#FormRepeater",
            widgetProps: {
                title: "form.attributesSectionTitle",
                arrayField: "attributeCombination",
                defaultItem: {attribute: "", value: ""},
                addLabel: "form.attributeAddRow",
                removeLabel: "form.attributeRemoveRow",
                rowTitleFields: ["value"],
                rowTitlePlaceholder: "form.attributeRowTitle",
                rowTemplate: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "attribute",
                                    widget: "#ApiSelect",
                                    label: "form.attributeLabel",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/productAttribute/select",
                                        method: "POST",
                                        normalizeEmptyToUndefined: true,
                                    },
                                },
                            },
                            {render: "#Field", field: {name: "value", widget: "#Input", label: "form.valueLabel", required: true}},
                        ],
                    },
                ],
            },
        },
    },
];

export const productVariantSheetView: ViewConfig = {
    model: "productVariants",
    viewType: "sheet",
    accessModel: "productVariants",
    apiUrl: "/api/eCommerce/productVariant",
    header: {titleField: "sku", subtitleKey: "productVariantSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "sku"}, field: {name: "sku", widget: "#SmallInfoCard", label: "sku", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "barcode"}, field: {name: "barcode", widget: "#SmallInfoCard", label: "barcode", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "price"}, field: {name: "price", widget: "#SmallInfoCard", label: "price", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "compareAtPrice"}, field: {name: "compareAtPrice", widget: "#SmallInfoCard", label: "compareAtPrice", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "status"}, field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "variantStatus"}}},
                        {render: "#SmallInfoCard", permissions: {read: "position"}, field: {name: "position", widget: "#SmallInfoCard", label: "position", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "weight"}, field: {name: "weight", widget: "#SmallInfoCard", label: "weight", widgetProps: {icon: "#IconWeight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "trackInventory"}, field: {name: "trackInventory", widget: "#SmallInfoCard", label: "trackInventory", widgetProps: {icon: "#IconToggleRight"}}},
                    ],
                },
            ],
        },
    ],
};

export const productVariantCreateFormView: ViewConfig = {
    model: "productVariants",
    viewType: "form",
    viewMode: "create",
    accessModel: "productVariants",
    apiUrl: "/api/eCommerce/productVariant",
    method: "PUT",
    nodes: productVariantFormFields,
};

export const productVariantEditFormView: ViewConfig = {
    model: "productVariants",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productVariants",
    apiUrl: "/api/eCommerce/productVariant",
    method: "PATCH",
    nodes: productVariantFormFields,
};

export const productVariantViews: ViewConfig[] = [productVariantSheetView, productVariantCreateFormView, productVariantEditFormView];
