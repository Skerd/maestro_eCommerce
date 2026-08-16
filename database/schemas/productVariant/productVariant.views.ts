import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const productVariantStatusOptions = [
    {value: "active", label: "form.variantStatus.active"},
    {value: "inactive", label: "form.variantStatus.inactive"},
];

const productVariantFormFields: ViewConfig["nodes"] = [
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
                            name: "product",
                            widget: "#ApiSelect",
                            label: "form.productLabel",
                            placeholder: "form.productPlaceholder",
                            required: true,
                            widgetProps: {
                                apiUrl: "/api/eCommerce/product/select",
                                method: "POST",
                                pageSize: 50,
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
                    {render: "#Field", field: {name: "sku", widget: "#Input", label: "form.skuLabel", placeholder: "form.skuPlaceholder"}},
                    {render: "#Field", field: {name: "barcode", widget: "#Input", label: "form.barcodeLabel", placeholder: "form.barcodePlaceholder"}},
                    {render: "#Field", field: {name: "position", widget: "#Input", label: "form.positionLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "trackInventory", widget: "#Checkbox", label: "form.trackInventoryLabel"}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.pricingSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "price", widget: "#Input", label: "form.priceLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "compareAtPrice", widget: "#Input", label: "form.compareAtPriceLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "costPrice", widget: "#Input", label: "form.costPriceLabel", widgetProps: {type: "number", min: 0}}},
                    {
                        render: "#Field",
                        field: {
                            name: "currency",
                            widget: "#ApiSelect",
                            label: "form.currencyLabel",
                            placeholder: "form.currencyPlaceholder",
                            widgetProps: {
                                apiUrl: "/api/finance/currency/select",
                                method: "GET",
                                pageSize: 50,
                                normalizeEmptyToUndefined: true,
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.physicalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "weight", widget: "#Input", label: "form.weightLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.length", widget: "#Input", label: "form.dimensionLengthLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.width", widget: "#Input", label: "form.dimensionWidthLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.height", widget: "#Input", label: "form.dimensionHeightLabel", widgetProps: {type: "number", min: 0}}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#Field",
                field: {
                    name: "mainImage",
                    widget: "#MediaField",
                    label: "form.mainImageLabel",
                    widgetProps: {mediaType: "image", mode: "single"},
                },
            },
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
                                    placeholder: "form.attributePlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/productAttribute/select",
                                        method: "POST",
                                        pageSize: 50,
                                        normalizeEmptyToUndefined: true,
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "value",
                                    widget: "#Input",
                                    label: "form.valueLabel",
                                    placeholder: "form.valuePlaceholder",
                                    required: true,
                                },
                            },
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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "product"},
                            field: {
                                name: "product",
                                widget: "#DisplayCard",
                                label: "product",
                                widgetProps: {
                                    icon: "#IconPackage",
                                    parent: "product",
                                    valuePath: ["title", "slug"],
                                    joinSeparator: " · ",
                                    pickFirstTruthyValuePath: true,
                                    linkedRefPath: "product",
                                    linkedSheetModel: "products",
                                    linkedSheetWidget: "#ProductSheetView",
                                    linkedSheetEntityProp: "product",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "sku"},
                            field: {name: "sku", widget: "#DisplayCard", label: "sku", widgetProps: {icon: "#IconBarcode"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "barcode"},
                            field: {name: "barcode", widget: "#DisplayCard", label: "barcode", widgetProps: {icon: "#IconBarcode"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "variantStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "position"},
                            field: {name: "position", widget: "#DisplayCard", label: "position", widgetProps: {icon: "#Hash", type: "number"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "trackInventory"},
                            field: {
                                name: "trackInventory",
                                widget: "#DisplayCard",
                                label: "trackInventory",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
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
            props: {title: "pricing"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "price"},
                            field: {name: "price", widget: "#DisplayCard", label: "price", widgetProps: {icon: "#IconCurrencyDollar", type: "number", format: "locale"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "compareAtPrice"},
                            field: {
                                name: "compareAtPrice",
                                widget: "#DisplayCard",
                                label: "compareAtPrice",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "costPrice"},
                            field: {
                                name: "costPrice",
                                widget: "#DisplayCard",
                                label: "costPrice",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "currency"},
                            field: {
                                name: "currency",
                                widget: "#DisplayCard",
                                label: "currency",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    parent: "currency",
                                    valuePath: ["symbol", "name"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "physical"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "weight"},
                            field: {name: "weight", widget: "#DisplayCard", label: "weight", widgetProps: {icon: "#IconWeight", format: "locale"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "dimensions"},
                            field: {
                                name: "dimensions.length",
                                widget: "#DisplayCard",
                                label: "dimensionLength",
                                widgetProps: {icon: "#IconRuler", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "dimensions"},
                            field: {
                                name: "dimensions.width",
                                widget: "#DisplayCard",
                                label: "dimensionWidth",
                                widgetProps: {icon: "#IconRuler", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "dimensions"},
                            field: {
                                name: "dimensions.height",
                                widget: "#DisplayCard",
                                label: "dimensionHeight",
                                widgetProps: {icon: "#IconRuler", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "media"},
            permissions: {read: "mainImage"},
            dependent: "mainImage",
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#SheetMediaAvatar",
                            permissions: {read: "mainImage"},
                            field: {
                                name: "mainImage",
                                widget: "#SheetMediaAvatar",
                                widgetProps: {nameField: "sku"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productVariant.sheet.attributes.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "attributes",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    dependent: "attributeCombination",
                    permissions: {read: "attributeCombination"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "attributeCombination"},
                                    field: {
                                        name: "attributeCombination",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            compactSummaryFields: ["attribute", "value"],
                                            fields: [
                                                {
                                                    name: "attribute",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["name"],
                                                    labelKey: "attribute",
                                                },
                                                {
                                                    name: "value",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "value",
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
        lifecycleSheetGroup,
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
