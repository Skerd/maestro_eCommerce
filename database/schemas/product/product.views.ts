import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const productTypeOptions = [
    {value: "physical", label: "form.productType.physical"},
    {value: "digital", label: "form.productType.digital"},
    {value: "service", label: "form.productType.service"},
    {value: "variable", label: "form.productType.variable"},
    {value: "bundle", label: "form.productType.bundle"},
    {value: "gift_card", label: "form.productType.gift_card"},
];

const productStatusOptions = [
    {value: "draft", label: "form.productStatus.draft"},
    {value: "active", label: "form.productStatus.active"},
    {value: "archived", label: "form.productStatus.archived"},
];

const weightUnitOptions = [
    {value: "kg", label: "form.weightUnit.kg"},
    {value: "lb", label: "form.weightUnit.lb"},
    {value: "g", label: "form.weightUnit.g"},
    {value: "oz", label: "form.weightUnit.oz"},
];

const dimensionUnitOptions = [
    {value: "cm", label: "form.dimensionUnit.cm"},
    {value: "in", label: "form.dimensionUnit.in"},
];

const twitterCardOptions = [
    {value: "summary", label: "form.twitterCard.summary"},
    {value: "summary_large_image", label: "form.twitterCard.summary_large_image"},
];

const productChip = (name: string) => ({
    render: "#Field",
    field: {
        name,
        widget: "#FormObjectIdChips",
        label: `form.${name}Label`,
        widgetProps: {
            apiUrl: "/api/eCommerce/product/select",
            method: "POST",
            placeholderKey: "form.selectProduct",
            removeTooltipKey: "form.removeProduct",
            selectPageSizeCreate: 50,
            selectPageSizeEdit: 200,
            labelRefFormExtraKey: name,
        },
    },
});

const productFormFields: ViewConfig["nodes"] = [
    // ── General ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "title", widget: "#Input", label: "form.titleLabel", placeholder: "form.titlePlaceholder", required: true}},
                    {render: "#Field", field: {name: "slug", widget: "#Input", label: "form.slugLabel", placeholder: "form.slugPlaceholder"}},
                    {render: "#Field", field: {name: "type", widget: "#Select", label: "form.typeLabel", placeholder: "form.typePlaceholder", required: true, widgetProps: {options: productTypeOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "status", widget: "#Select", label: "form.statusLabel", placeholder: "form.statusPlaceholder", widgetProps: {options: productStatusOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "brand", widget: "#Input", label: "form.brandLabel", placeholder: "form.brandPlaceholder"}},
                    {render: "#Field", field: {name: "vendor", widget: "#Input", label: "form.vendorLabel", placeholder: "form.vendorPlaceholder"}},
                    {render: "#Field", field: {name: "featured", widget: "#Switch", label: "form.featuredLabel"}},
                    {render: "#Field", field: {name: "availableForSale", widget: "#Switch", label: "form.availableForSaleLabel"}},
                ],
            },
            {render: "#Field", field: {name: "shortDescription", widget: "#Textarea", label: "form.shortDescriptionLabel", placeholder: "form.shortDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto"}}},
            {render: "#Field", field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", placeholder: "form.descriptionPlaceholder", widgetProps: {rows: 6, className: "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto"}}},
            {render: "#Field", field: {name: "tags", widget: "#StringArrayField", label: "form.tagsLabel", placeholder: "form.tagsPlaceholder", widgetProps: {removeTooltipKey: "form.removeTag"}}},
        ],
    },

    // ── Identifiers ────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.identifiersSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "sku", widget: "#Input", label: "form.skuLabel", placeholder: "form.skuPlaceholder"}},
                    {render: "#Field", field: {name: "barcode", widget: "#Input", label: "form.barcodeLabel", placeholder: "form.barcodePlaceholder"}},
                    {render: "#Field", field: {name: "gtin", widget: "#Input", label: "form.gtinLabel", placeholder: "form.gtinPlaceholder"}},
                    {render: "#Field", field: {name: "upc", widget: "#Input", label: "form.upcLabel", placeholder: "form.upcPlaceholder"}},
                    {render: "#Field", field: {name: "ean", widget: "#Input", label: "form.eanLabel", placeholder: "form.eanPlaceholder"}},
                    {render: "#Field", field: {name: "isbn", widget: "#Input", label: "form.isbnLabel", placeholder: "form.isbnPlaceholder"}},
                    {render: "#Field", field: {name: "mpn", widget: "#Input", label: "form.mpnLabel", placeholder: "form.mpnPlaceholder"}},
                    {render: "#Field", field: {name: "hsCode", widget: "#Input", label: "form.hsCodeLabel", placeholder: "form.hsCodePlaceholder"}},
                    {render: "#Field", field: {name: "countryOfOrigin", widget: "#Input", label: "form.countryOfOriginLabel", placeholder: "form.countryOfOriginPlaceholder"}},
                ],
            },
        ],
    },

    // ── Pricing ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.pricingSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "price", widget: "#Input", label: "form.priceLabel", placeholder: "form.pricePlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "compareAtPrice", widget: "#Input", label: "form.compareAtPriceLabel", placeholder: "form.compareAtPricePlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "costPrice", widget: "#Input", label: "form.costPriceLabel", placeholder: "form.costPricePlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "msrp", widget: "#Input", label: "form.msrpLabel", placeholder: "form.msrpPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "currency", widget: "#ApiSelect", label: "form.currencyLabel", placeholder: "form.currencyPlaceholder", widgetProps: {apiUrl: "/api/finance/currency/select", method: "GET", normalizeEmptyToUndefined: true, defaultOptionsFormExtraKey: "currencyDefaultOptions"}}},
                    {render: "#Field", field: {name: "saleStartsAt", widget: "#DateInput", label: "form.saleStartsAtLabel", placeholder: "form.saleStartsAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", field: {name: "saleEndsAt", widget: "#DateInput", label: "form.saleEndsAtLabel", placeholder: "form.saleEndsAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", field: {name: "minOrderQty", widget: "#Input", label: "form.minOrderQtyLabel", placeholder: "form.minOrderQtyPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "maxOrderQty", widget: "#Input", label: "form.maxOrderQtyLabel", placeholder: "form.maxOrderQtyPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "stepQty", widget: "#Input", label: "form.stepQtyLabel", placeholder: "form.stepQtyPlaceholder", widgetProps: {type: "number", min: 0}}},
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "taxable", widget: "#Switch", label: "form.taxableLabel"}},
                    {render: "#Field", field: {name: "taxClass", widget: "#Input", label: "form.taxClassLabel", placeholder: "form.taxClassPlaceholder"}},
                ],
            },
        ],
    },

    // ── Inventory ──────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.inventorySectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "trackInventory", widget: "#Switch", label: "form.trackInventoryLabel"}},
                    {render: "#Field", field: {name: "allowBackorder", widget: "#Switch", label: "form.allowBackorderLabel"}},
                    {render: "#Field", field: {name: "lowStockThreshold", widget: "#Input", label: "form.lowStockThresholdLabel", placeholder: "form.lowStockThresholdPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "safetyStock", widget: "#Input", label: "form.safetyStockLabel", placeholder: "form.safetyStockPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "backorderLimit", widget: "#Input", label: "form.backorderLimitLabel", placeholder: "form.backorderLimitPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "preorderEnabled", widget: "#Switch", label: "form.preorderEnabledLabel"}},
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {watchField: "preorderEnabled", whenValues: ["true"], clearFields: ["preorderAvailableAt"]},
                children: [
                    {render: "#Field", field: {name: "preorderAvailableAt", widget: "#DateInput", label: "form.preorderAvailableAtLabel", placeholder: "form.preorderAvailableAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                ],
            },
        ],
    },

    // ── Shipping ───────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.shippingSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "weight", widget: "#Input", label: "form.weightLabel", placeholder: "form.weightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "weightUnit", widget: "#Select", label: "form.weightUnitLabel", placeholder: "form.weightUnitPlaceholder", widgetProps: {options: weightUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "dimensions.length", widget: "#Input", label: "form.dimensionLengthLabel", placeholder: "form.dimensionLengthPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.width", widget: "#Input", label: "form.dimensionWidthLabel", placeholder: "form.dimensionWidthPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.height", widget: "#Input", label: "form.dimensionHeightLabel", placeholder: "form.dimensionHeightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensionUnit", widget: "#Select", label: "form.dimensionUnitLabel", placeholder: "form.dimensionUnitPlaceholder", widgetProps: {options: dimensionUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "volumetricWeight", widget: "#Input", label: "form.volumetricWeightLabel", placeholder: "form.volumetricWeightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "shippingClass", widget: "#Input", label: "form.shippingClassLabel", placeholder: "form.shippingClassPlaceholder"}},
                    {render: "#Field", field: {name: "isHazmat", widget: "#Switch", label: "form.isHazmatLabel"}},
                    {render: "#Field", field: {name: "requiresShipping", widget: "#Switch", label: "form.requiresShippingLabel"}},
                ],
            },
        ],
    },

    // ── Organization ───────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.organizationSectionTitle"},
        children: [
            {
                render: "#Field",
                field: {
                    name: "categories",
                    widget: "#FormObjectIdChips",
                    label: "form.categoriesLabel",
                    widgetProps: {apiUrl: "/api/eCommerce/category/select", method: "POST", placeholderKey: "form.selectCategory", removeTooltipKey: "form.removeCategory", selectPageSizeCreate: 50, selectPageSizeEdit: 200, labelRefFormExtraKey: "categories"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "collections",
                    widget: "#FormObjectIdChips",
                    label: "form.collectionsLabel",
                    widgetProps: {apiUrl: "/api/eCommerce/collection/select", method: "POST", placeholderKey: "form.selectCollection", removeTooltipKey: "form.removeCollection", selectPageSizeCreate: 50, selectPageSizeEdit: 200, labelRefFormExtraKey: "collections"},
                },
            },
        ],
    },

    // ── Variants & options ─────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.variantsSectionTitle"},
        children: [
            {render: "#Field", field: {name: "hasVariants", widget: "#Switch", label: "form.hasVariantsLabel"}},
            {
                render: "#Field",
                field: {
                    name: "variantOptions",
                    widget: "#FormObjectIdChips",
                    label: "form.variantOptionsLabel",
                    widgetProps: {apiUrl: "/api/eCommerce/productAttribute/select", method: "POST", placeholderKey: "form.selectAttribute", removeTooltipKey: "form.removeAttribute", selectPageSizeCreate: 50, selectPageSizeEdit: 200, labelRefFormExtraKey: "variantOptions"},
                },
            },
        ],
    },

    // ── Bundle components (type "bundle") ─────────────────────
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "type", whenValues: ["bundle"]},
        children: [
            {
                render: "#Field",
                field: {
                    name: "bundleComponents",
                    widget: "#FormRepeater",
                    widgetProps: {
                        title: "form.bundleComponentsSectionTitle",
                        arrayField: "bundleComponents",
                        defaultItem: {product: "", quantity: 1},
                        addLabel: "form.bundleComponentAddRow",
                        removeLabel: "form.bundleComponentRemoveRow",
                        rowTitleFields: ["quantity"],
                        rowTitlePlaceholder: "form.bundleComponentRowTitle",
                        rowTemplate: [
                            {
                                render: "#FormGrid",
                                props: {columns: 2},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "product",
                                            widget: "#ApiSelect",
                                            label: "form.bundleComponentProductLabel",
                                            placeholder: "form.bundleComponentProductPlaceholder",
                                            required: true,
                                            widgetProps: {apiUrl: "/api/eCommerce/product/select", method: "POST", normalizeEmptyToUndefined: true},
                                        },
                                    },
                                    {render: "#Field", field: {name: "quantity", widget: "#Input", label: "form.bundleComponentQuantityLabel", placeholder: "form.bundleComponentQuantityPlaceholder", required: true, widgetProps: {type: "number", min: 1}}},
                                ],
                            },
                        ],
                    },
                },
            },
        ],
    },

    // ── Digital delivery (type "digital") ──────────────────────
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "type", whenValues: ["digital"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "downloadLimit", widget: "#Input", label: "form.downloadLimitLabel", placeholder: "form.downloadLimitPlaceholder", widgetProps: {type: "number", min: 1}}},
                    {render: "#Field", field: {name: "downloadExpiryDays", widget: "#Input", label: "form.downloadExpiryDaysLabel", placeholder: "form.downloadExpiryDaysPlaceholder", widgetProps: {type: "number", min: 1}}},
                ],
            },
        ],
    },

    // ── Media ──────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle"},
        children: [
            {render: "#Field", field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel", widgetProps: {mediaType: "image", mode: "single"}}},
            {render: "#Field", field: {name: "gallery", widget: "#MediaField", label: "form.galleryLabel", widgetProps: {mediaType: "image", mode: "multiple", maxCount: 20}}},
            {render: "#Field", field: {name: "documents", widget: "#MediaField", label: "form.documentsLabel", widgetProps: {mediaType: "file", mode: "multiple", maxCount: 20}}},
            {render: "#Field", field: {name: "videoUrls", widget: "#StringArrayField", label: "form.videoUrlsLabel", placeholder: "form.videoUrlPlaceholder", widgetProps: {removeTooltipKey: "form.removeVideoUrl"}}},
        ],
    },

    // ── Content ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.contentSectionTitle"},
        children: [
            {render: "#Field", field: {name: "highlights", widget: "#StringArrayField", label: "form.highlightsLabel", placeholder: "form.highlightsPlaceholder", widgetProps: {removeTooltipKey: "form.removeHighlight"}}},
            {render: "#Field", field: {name: "careInstructions", widget: "#Textarea", label: "form.careInstructionsLabel", placeholder: "form.careInstructionsPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto"}}},
            {render: "#Field", field: {name: "warranty", widget: "#Input", label: "form.warrantyLabel", placeholder: "form.warrantyPlaceholder"}},
            {
                render: "#Field",
                field: {
                    name: "faqs",
                    widget: "#FormRepeater",
                    widgetProps: {
                        title: "form.faqsSectionTitle",
                        arrayField: "faqs",
                        defaultItem: {question: "", answer: ""},
                        addLabel: "form.faqAddRow",
                        removeLabel: "form.faqRemoveRow",
                        rowTitleFields: ["question"],
                        rowTitlePlaceholder: "form.faqRowTitle",
                        rowTemplate: [
                            {
                                render: "div",
                                props: {className: "space-y-4"},
                                children: [
                                    {render: "#Field", field: {name: "question", widget: "#Input", label: "form.faqQuestionLabel", placeholder: "form.faqQuestionPlaceholder", required: true}},
                                    {render: "#Field", field: {name: "answer", widget: "#Textarea", label: "form.faqAnswerLabel", placeholder: "form.faqAnswerPlaceholder", required: true, widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto"}}},
                                ],
                            },
                        ],
                    },
                },
            },
        ],
    },

    // ── Attributes & specifications ────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.attributesSectionTitle"},
        children: [
            {
                render: "#Field",
                field: {
                    name: "attributes",
                    widget: "#FormRepeater",
                    widgetProps: {
                        title: "form.attributesSectionTitle",
                        arrayField: "attributes",
                        defaultItem: {name: "", values: []},
                        addLabel: "form.attributeAddRow",
                        removeLabel: "form.attributeRemoveRow",
                        rowTitleFields: ["name"],
                        rowTitlePlaceholder: "form.attributeRowTitle",
                        rowTemplate: [
                            {
                                render: "div",
                                props: {className: "space-y-4"},
                                children: [
                                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.attributeNameLabel", placeholder: "form.attributeNamePlaceholder", required: true}},
                                    {render: "#Field", field: {name: "values", widget: "#StringArrayField", label: "form.attributeValuesLabel", placeholder: "form.attributeValuesPlaceholder", widgetProps: {removeTooltipKey: "form.removeValue"}}},
                                ],
                            },
                        ],
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "specifications",
                    widget: "#FormRepeater",
                    widgetProps: {
                        title: "form.specificationsSectionTitle",
                        arrayField: "specifications",
                        defaultItem: {label: "", value: ""},
                        addLabel: "form.specificationAddRow",
                        removeLabel: "form.specificationRemoveRow",
                        rowTitleFields: ["label"],
                        rowTitlePlaceholder: "form.specificationRowTitle",
                        rowTemplate: [
                            {
                                render: "div",
                                props: {className: "space-y-4"},
                                children: [
                                    {render: "#Field", field: {name: "label", widget: "#Input", label: "form.specLabelLabel", placeholder: "form.specLabelPlaceholder", required: true}},
                                    {render: "#Field", field: {name: "value", widget: "#Input", label: "form.specValueLabel", placeholder: "form.specValuePlaceholder", required: true}},
                                ],
                            },
                        ],
                    },
                },
            },
        ],
    },

    // ── Merchandising ──────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.merchandisingSectionTitle"},
        children: [
            productChip("relatedProducts"),
            productChip("upsells"),
            productChip("crossSells"),
            productChip("frequentlyBoughtTogether"),
            {render: "#Field", field: {name: "badges", widget: "#StringArrayField", label: "form.badgesLabel", placeholder: "form.badgesPlaceholder", widgetProps: {removeTooltipKey: "form.removeBadge"}}},
        ],
    },

    // ── SEO ────────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.seoSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "seo.metaTitle", widget: "#Input", label: "form.seoMetaTitleLabel", placeholder: "form.seoMetaTitlePlaceholder"}},
                    {render: "#Field", field: {name: "seo.canonicalUrl", widget: "#Input", label: "form.seoCanonicalUrlLabel", placeholder: "form.seoCanonicalUrlPlaceholder"}},
                    {render: "#Field", field: {name: "seo.openGraphTitle", widget: "#Input", label: "form.seoOpenGraphTitleLabel", placeholder: "form.seoOpenGraphTitlePlaceholder"}},
                    {render: "#Field", field: {name: "seo.structuredDataType", widget: "#Input", label: "form.seoStructuredDataTypeLabel", placeholder: "form.seoStructuredDataTypePlaceholder"}},
                    {render: "#Field", field: {name: "seo.twitterCard", widget: "#Select", label: "form.seoTwitterCardLabel", placeholder: "form.seoTwitterCardPlaceholder", widgetProps: {options: twitterCardOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "seo.sitemapPriority", widget: "#Input", label: "form.seoSitemapPriorityLabel", placeholder: "form.seoSitemapPriorityPlaceholder", widgetProps: {type: "number", min: 0, max: 1, step: 0.1}}},
                    {render: "#Field", field: {name: "seo.sitemapInclude", widget: "#Switch", label: "form.seoSitemapIncludeLabel"}},
                    {render: "#Field", field: {name: "seo.noIndex", widget: "#Switch", label: "form.seoNoIndexLabel"}},
                ],
            },
            {render: "#Field", field: {name: "seo.metaDescription", widget: "#Textarea", label: "form.seoMetaDescriptionLabel", placeholder: "form.seoMetaDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto"}}},
            {render: "#Field", field: {name: "seo.openGraphDescription", widget: "#Textarea", label: "form.seoOpenGraphDescriptionLabel", placeholder: "form.seoOpenGraphDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto"}}},
            {render: "#Field", field: {name: "seo.metaKeywords", widget: "#StringArrayField", label: "form.seoMetaKeywordsLabel", placeholder: "form.seoMetaKeywordsPlaceholder", widgetProps: {removeTooltipKey: "form.removeKeyword"}}},
        ],
    },

];

const productRefSheetGroup = (title: string, field: string, storageKey: string,): NonNullable<ViewConfig["nodes"]>[number] => ({
    render: "#ReferencesViewModeScope",
    props: {
        storageKey,
        defaultMode: "compact",
    },
    children: [
        {
            render: "#SheetGroup",
            props: {
                title,
                titleActions: "#ReferencesViewModeToggle",
                defaultOpen: false,
            },
            dependent: field,
            permissions: {read: field},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ReferencesRender",
                            permissions: {read: field},
                            field: {
                                name: field,
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
});

export const productSheetView: ViewConfig = {
    model: "products",
    viewType: "sheet",
    accessModel: "products",
    apiUrl: "/api/eCommerce/product",
    header: {
        titleField: "title",
        subtitleKey: "productSubtitle",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconPackage", languageKeyCategory: "productType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "status"}, field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "productStatus"}}},
                        {render: "#SmallInfoCard", permissions: {read: "slug"}, field: {name: "slug", widget: "#SmallInfoCard", label: "slug", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", permissions: {read: "sku"}, field: {name: "sku", widget: "#SmallInfoCard", label: "sku", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "brand"}, field: {name: "brand", widget: "#SmallInfoCard", label: "brand", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "vendor"}, field: {name: "vendor", widget: "#SmallInfoCard", label: "vendor", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#SmallInfoCard", permissions: {read: "featured"}, field: {name: "featured", widget: "#SmallInfoCard", label: "featured", widgetProps: {icon: "#IconStar", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "availableForSale"}, field: {name: "availableForSale", widget: "#SmallInfoCard", label: "availableForSale", widgetProps: {icon: "#IconShoppingCart", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "ratingAverage"}, field: {name: "ratingAverage", widget: "#SmallInfoCard", label: "ratingAverage", widgetProps: {icon: "#IconStar", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "reviewCount"}, field: {name: "reviewCount", widget: "#SmallInfoCard", label: "reviewCount", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "variantCount"}, field: {name: "variantCount", widget: "#SmallInfoCard", label: "variantCount", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "publishedAt"}, field: {name: "publishedAt", widget: "#SmallInfoCard", label: "publishedAt", widgetProps: {icon: "#IconCalendar", format: "dateTime"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "tags"},
                            field: {name: "tags", widget: "#SmallInfoCard", label: "tags", widgetProps: {icon: "#IconTags", valueType: "stringBadgeList"}},
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "shortDescription", defaultOpen: false},
            permissions: {read: "shortDescription"},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "shortDescription"},
                            field: {name: "shortDescription", widget: "#ExpandableText", widgetProps: {className: "text-sm"}},
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "description", defaultOpen: false},
            permissions: {read: "description"},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "description"},
                            field: {name: "description", widget: "#ExpandableText", widgetProps: {className: "text-sm"}},
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "identifiers", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "barcode"}, field: {name: "barcode", widget: "#SmallInfoCard", label: "barcode", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "gtin"}, field: {name: "gtin", widget: "#SmallInfoCard", label: "gtin", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "upc"}, field: {name: "upc", widget: "#SmallInfoCard", label: "upc", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "ean"}, field: {name: "ean", widget: "#SmallInfoCard", label: "ean", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isbn"}, field: {name: "isbn", widget: "#SmallInfoCard", label: "isbn", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "mpn"}, field: {name: "mpn", widget: "#SmallInfoCard", label: "mpn", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "hsCode"}, field: {name: "hsCode", widget: "#SmallInfoCard", label: "hsCode", widgetProps: {icon: "#IconWorld"}}},
                        {render: "#SmallInfoCard", permissions: {read: "countryOfOrigin"}, field: {name: "countryOfOrigin", widget: "#SmallInfoCard", label: "countryOfOrigin", widgetProps: {icon: "#IconWorld"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "pricing", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "price"}, field: {name: "price", widget: "#SmallInfoCard", label: "price", widgetProps: {icon: "#IconCurrencyDollar", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "compareAtPrice"}, field: {name: "compareAtPrice", widget: "#SmallInfoCard", label: "compareAtPrice", widgetProps: {icon: "#IconCurrencyDollar", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "costPrice"}, field: {name: "costPrice", widget: "#SmallInfoCard", label: "costPrice", widgetProps: {icon: "#IconCurrencyDollar", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "msrp"}, field: {name: "msrp", widget: "#SmallInfoCard", label: "msrp", widgetProps: {icon: "#IconCurrencyDollar", format: "locale"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "currency"},
                            field: {
                                name: "currency",
                                widget: "#SmallInfoCard",
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
                        {render: "#SmallInfoCard", permissions: {read: "taxable"}, field: {name: "taxable", widget: "#SmallInfoCard", label: "taxable", widgetProps: {icon: "#IconReceiptTax", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "taxClass"}, field: {name: "taxClass", widget: "#SmallInfoCard", label: "taxClass", widgetProps: {icon: "#IconReceiptTax"}}},
                        {render: "#SmallInfoCard", permissions: {read: "saleStartsAt"}, field: {name: "saleStartsAt", widget: "#SmallInfoCard", label: "saleStartsAt", widgetProps: {icon: "#IconCalendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", permissions: {read: "saleEndsAt"}, field: {name: "saleEndsAt", widget: "#SmallInfoCard", label: "saleEndsAt", widgetProps: {icon: "#IconCalendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", permissions: {read: "minOrderQty"}, field: {name: "minOrderQty", widget: "#SmallInfoCard", label: "minOrderQty", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "maxOrderQty"}, field: {name: "maxOrderQty", widget: "#SmallInfoCard", label: "maxOrderQty", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "stepQty"}, field: {name: "stepQty", widget: "#SmallInfoCard", label: "stepQty", widgetProps: {icon: "#Hash", format: "locale"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "inventory", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "trackInventory"}, field: {name: "trackInventory", widget: "#SmallInfoCard", label: "trackInventory", widgetProps: {icon: "#IconToggleRight", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "allowBackorder"}, field: {name: "allowBackorder", widget: "#SmallInfoCard", label: "allowBackorder", widgetProps: {icon: "#IconPackageOff", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "lowStockThreshold"}, field: {name: "lowStockThreshold", widget: "#SmallInfoCard", label: "lowStockThreshold", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "safetyStock"}, field: {name: "safetyStock", widget: "#SmallInfoCard", label: "safetyStock", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "backorderLimit"}, field: {name: "backorderLimit", widget: "#SmallInfoCard", label: "backorderLimit", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "preorderEnabled"}, field: {name: "preorderEnabled", widget: "#SmallInfoCard", label: "preorderEnabled", widgetProps: {icon: "#IconClock", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "preorderAvailableAt"}, field: {name: "preorderAvailableAt", widget: "#SmallInfoCard", label: "preorderAvailableAt", widgetProps: {icon: "#IconCalendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", permissions: {read: "downloadLimit"}, field: {name: "downloadLimit", widget: "#SmallInfoCard", label: "downloadLimit", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "downloadExpiryDays"}, field: {name: "downloadExpiryDays", widget: "#SmallInfoCard", label: "downloadExpiryDays", widgetProps: {icon: "#IconCalendar", format: "locale"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "shipping", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "weight"}, field: {name: "weight", widget: "#SmallInfoCard", label: "weight", widgetProps: {icon: "#IconWeight", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "weightUnit"}, field: {name: "weightUnit", widget: "#SmallInfoCard", label: "weightUnit", widgetProps: {icon: "#IconWeight", languageKeyCategory: "weightUnits"}}},
                        {render: "#SmallInfoCard", permissions: {read: "dimensions"}, field: {name: "dimensions.length", widget: "#SmallInfoCard", label: "dimensionLength", widgetProps: {icon: "#IconRuler", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "dimensions"}, field: {name: "dimensions.width", widget: "#SmallInfoCard", label: "dimensionWidth", widgetProps: {icon: "#IconRuler", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "dimensions"}, field: {name: "dimensions.height", widget: "#SmallInfoCard", label: "dimensionHeight", widgetProps: {icon: "#IconRuler", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "dimensionUnit"}, field: {name: "dimensionUnit", widget: "#SmallInfoCard", label: "dimensionUnit", widgetProps: {icon: "#IconRuler", languageKeyCategory: "dimensionUnits"}}},
                        {render: "#SmallInfoCard", permissions: {read: "volumetricWeight"}, field: {name: "volumetricWeight", widget: "#SmallInfoCard", label: "volumetricWeight", widgetProps: {icon: "#IconWeight", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "shippingClass"}, field: {name: "shippingClass", widget: "#SmallInfoCard", label: "shippingClass", widgetProps: {icon: "#IconTruckDelivery"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isHazmat"}, field: {name: "isHazmat", widget: "#SmallInfoCard", label: "isHazmat", widgetProps: {icon: "#IconAlertTriangle", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "requiresShipping"}, field: {name: "requiresShipping", widget: "#SmallInfoCard", label: "requiresShipping", widgetProps: {icon: "#IconTruckDelivery", valueType: "boolean"}}},
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "product.sheet.categories.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "categories",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "categories",
                    permissions: {read: "categories"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "categories"},
                                    field: {
                                        name: "categories",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#CategoryCard",
                                            itemDataProp: "category",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconCategory2",
                                                label: "category",
                                                valuePath: ["name"],
                                                linkedSheetModel: "categories",
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
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "product.sheet.collections.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "collections",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "collections",
                    permissions: {read: "collections"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "collections"},
                                    field: {
                                        name: "collections",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#CollectionCard",
                                            itemDataProp: "collection",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconBox",
                                                label: "collection",
                                                valuePath: ["name"],
                                                linkedSheetModel: "collections",
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
            render: "#SheetGroup",
            props: {title: "variants", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "hasVariants"}, field: {name: "hasVariants", widget: "#SmallInfoCard", label: "hasVariants", widgetProps: {icon: "#IconToggleRight", valueType: "boolean"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "defaultVariant"},
                            field: {
                                name: "defaultVariant",
                                widget: "#SmallInfoCard",
                                label: "defaultVariant",
                                widgetProps: {
                                    icon: "#IconPackage",
                                    parent: "defaultVariant",
                                    valuePath: ["sku"],
                                    linkedRefPath: "defaultVariant",
                                    linkedSheetModel: "productVariants",
                                    linkedSheetWidget: "#ProductVariantSheetView",
                                    linkedSheetEntityProp: "entity",
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
                storageKey: "product.sheet.variantOptions.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "variantOptions",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "variantOptions",
                    permissions: {read: "variantOptions"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "variantOptions"},
                                    field: {
                                        name: "variantOptions",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#ProductAttributeCard",
                                            itemDataProp: "productAttribute",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconList",
                                                label: "productAttribute",
                                                valuePath: ["name"],
                                                linkedSheetModel: "productAttributes",
                                                linkedSheetWidget: "#ProductAttributeSheetView",
                                                linkedSheetEntityProp: "productAttribute",
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
            props: {title: "media", defaultOpen: false},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50 max-w-full space-y-4"},
                    children: [
                        {
                            render: "#GalleryCarousel",
                            permissions: {readAny: ["mainImage", "gallery"]},
                            field: {
                                name: "mainImage",
                                widget: "#GalleryCarousel",
                                label: "images",
                                widgetProps: {
                                    icon: "#IconPhoto",
                                    imageGalleryField: "gallery",
                                    showThumbnails: false,
                                    allowFullScreen: false,
                                    coverAfterFirst: false,
                                    showPreviews: true,
                                    previewLocation: "right",
                                },
                            },
                        },
                        {
                            render: "#SheetMediaFilesStrip",
                            permissions: {read: "documents"},
                            field: {
                                name: "documents",
                                widget: "#SheetMediaFilesStrip",
                                label: "documents",
                                widgetProps: {
                                    icon: "#IconFileText",
                                    canDownload: true,
                                    canRemove: false,
                                    isBig: false,
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "videoUrls"},
                            field: {
                                name: "videoUrls",
                                widget: "#SmallInfoCard",
                                label: "videoUrls",
                                widgetProps: {icon: "#IconVideo", valueType: "stringBadgeList"},
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
                            render: "#SmallInfoCard",
                            permissions: {read: "highlights"},
                            field: {
                                name: "highlights",
                                widget: "#SmallInfoCard",
                                label: "highlights",
                                widgetProps: {icon: "#IconList", valueType: "stringBadgeList"},
                            },
                        },
                        {render: "#SmallInfoCard", permissions: {read: "careInstructions"}, field: {name: "careInstructions", widget: "#SmallInfoCard", label: "careInstructions", widgetProps: {icon: "#IconInfoCircle"}}},
                        {render: "#SmallInfoCard", permissions: {read: "warranty"}, field: {name: "warranty", widget: "#SmallInfoCard", label: "warranty", widgetProps: {icon: "#IconShieldCheck"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "badges"},
                            field: {
                                name: "badges",
                                widget: "#SmallInfoCard",
                                label: "badges",
                                widgetProps: {icon: "#IconAward", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "faqs", defaultOpen: false},
            permissions: {read: "faqs"},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "faqs"},
                            field: {
                                name: "faqs",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm", valueType: "faqBlock"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "product.sheet.attributes.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "attributes",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "attributes",
                    permissions: {read: "attributes"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "attributes"},
                                    field: {
                                        name: "attributes",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            compactSummaryFields: ["name", "values"],
                                            fields: [
                                                {name: "name", type: "text", className: "text-sm font-medium", labelKey: "name"},
                                                {name: "values", type: "text", className: "text-sm", labelKey: "attributeValues"},
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
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "product.sheet.specifications.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "specifications",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "specifications",
                    permissions: {read: "specifications"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "specifications"},
                                    field: {
                                        name: "specifications",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            compactSummaryFields: ["label", "value"],
                                            fields: [
                                                {name: "label", type: "text", className: "text-sm font-medium", labelKey: "specLabel"},
                                                {name: "value", type: "text", className: "text-sm", labelKey: "specValue"},
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
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "product.sheet.bundleComponents.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "bundleComponents",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "bundleComponents",
                    permissions: {read: "bundleComponents"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "bundleComponents"},
                                    field: {
                                        name: "bundleComponents",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            compactSummaryFields: ["product", "quantity"],
                                            fields: [
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "sku"],
                                                    joinSeparator: " · ",
                                                    labelKey: "bundleComponentProduct",
                                                    linkedSheetModel: "products",
                                                    linkedSheetWidget: "#ProductSheetView",
                                                    linkedSheetEntityProp: "product",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "bundleComponentQuantity",
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
        productRefSheetGroup("relatedProducts", "relatedProducts", "product.sheet.relatedProducts.listDisplay"),
        productRefSheetGroup("upsells", "upsells", "product.sheet.upsells.listDisplay"),
        productRefSheetGroup("crossSells", "crossSells", "product.sheet.crossSells.listDisplay"),
        productRefSheetGroup("frequentlyBoughtTogether", "frequentlyBoughtTogether", "product.sheet.frequentlyBoughtTogether.listDisplay"),
        {
            render: "#SheetGroup",
            props: {title: "seo", defaultOpen: false},
            permissions: {read: "seo"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.metaTitle", widget: "#SmallInfoCard", label: "seoMetaTitle", widgetProps: {icon: "#IconSeo"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.canonicalUrl", widget: "#SmallInfoCard", label: "seoCanonicalUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.openGraphTitle", widget: "#SmallInfoCard", label: "seoOpenGraphTitle", widgetProps: {icon: "#IconShare"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.structuredDataType", widget: "#SmallInfoCard", label: "seoStructuredDataType", widgetProps: {icon: "#IconCode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.twitterCard", widget: "#SmallInfoCard", label: "seoTwitterCard", widgetProps: {icon: "#IconBrandX", languageKeyCategory: "twitterCard"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.sitemapPriority", widget: "#SmallInfoCard", label: "seoSitemapPriority", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.sitemapInclude", widget: "#SmallInfoCard", label: "seoSitemapInclude", widgetProps: {icon: "#IconToggleRight", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.noIndex", widget: "#SmallInfoCard", label: "seoNoIndex", widgetProps: {icon: "#IconEyeOff", valueType: "boolean"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.metaDescription", widget: "#SmallInfoCard", label: "seoMetaDescription", widgetProps: {icon: "#IconAlignLeft"}}},
                        {render: "#SmallInfoCard", permissions: {read: "seo"}, field: {name: "seo.openGraphDescription", widget: "#SmallInfoCard", label: "seoOpenGraphDescription", widgetProps: {icon: "#IconAlignLeft"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "seo"},
                            field: {
                                name: "seo.metaKeywords",
                                widget: "#SmallInfoCard",
                                label: "seoMetaKeywords",
                                widgetProps: {icon: "#IconTags", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "lifecycle", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "createdAt"}, field: {name: "createdAt", widget: "#SmallInfoCard", label: "createdAt", widgetProps: {icon: "#Calendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", permissions: {read: "updatedAt"}, field: {name: "updatedAt", widget: "#SmallInfoCard", label: "updatedAt", widgetProps: {icon: "#Calendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", permissions: {read: "createdBy"}, field: {name: "createdBy", widget: "#SmallInfoCard", label: "createdBy", widgetProps: {icon: "#User", parent: "createdBy", valuePath: ["name", "surname"], joinSeparator: " "}}},
                        {render: "#SmallInfoCard", dependent: "deletedAt", permissions: {read: "deletedAt"}, field: {name: "deletedAt", widget: "#SmallInfoCard", label: "deletedAt", widgetProps: {icon: "#Calendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", dependent: "deletedBy", permissions: {read: "deletedBy"}, field: {name: "deletedBy", widget: "#SmallInfoCard", label: "deletedBy", widgetProps: {icon: "#User", parent: "deletedBy", valuePath: ["name", "surname"], joinSeparator: " "}}},
                    ],
                },
            ],
        },
    ],
};

export const productCreateFormView: ViewConfig = {
    model: "products",
    viewType: "form",
    viewMode: "create",
    accessModel: "products",
    apiUrl: "/api/eCommerce/product",
    method: "PUT",
    nodes: productFormFields,
};

export const productEditFormView: ViewConfig = {
    model: "products",
    viewType: "form",
    viewMode: "edit",
    accessModel: "products",
    apiUrl: "/api/eCommerce/product",
    method: "PATCH",
    nodes: productFormFields,
};

export const productViews: ViewConfig[] = [productSheetView, productCreateFormView, productEditFormView];
