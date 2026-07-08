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
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "title", widget: "#Input", label: "form.titleLabel", required: true}},
            {render: "#Field", field: {name: "slug", widget: "#Input", label: "form.slugLabel"}},
            {render: "#Field", field: {name: "type", widget: "#Select", label: "form.typeLabel", required: true, widgetProps: {options: productTypeOptions, className: "grow w-full"}}},
            {render: "#Field", field: {name: "status", widget: "#Select", label: "form.statusLabel", widgetProps: {options: productStatusOptions, className: "grow w-full"}}},
            {render: "#Field", field: {name: "brand", widget: "#Input", label: "form.brandLabel"}},
            {render: "#Field", field: {name: "vendor", widget: "#Input", label: "form.vendorLabel"}},
            {render: "#Field", field: {name: "featured", widget: "#Checkbox", label: "form.featuredLabel"}},
            {render: "#Field", field: {name: "availableForSale", widget: "#Checkbox", label: "form.availableForSaleLabel"}},
        ],
    },
    {render: "#Field", field: {name: "shortDescription", widget: "#Textarea", label: "form.shortDescriptionLabel", widgetProps: {rows: 2}}},
    {render: "#Field", field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", widgetProps: {rows: 5}}},
    {render: "#Field", field: {name: "tags", widget: "#StringArrayField", label: "form.tagsLabel", widgetProps: {removeTooltipKey: "form.removeTag"}}},

    // ── Identifiers ────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.identifiersSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "sku", widget: "#Input", label: "form.skuLabel"}},
                    {render: "#Field", field: {name: "barcode", widget: "#Input", label: "form.barcodeLabel"}},
                    {render: "#Field", field: {name: "gtin", widget: "#Input", label: "form.gtinLabel"}},
                    {render: "#Field", field: {name: "upc", widget: "#Input", label: "form.upcLabel"}},
                    {render: "#Field", field: {name: "ean", widget: "#Input", label: "form.eanLabel"}},
                    {render: "#Field", field: {name: "isbn", widget: "#Input", label: "form.isbnLabel"}},
                    {render: "#Field", field: {name: "mpn", widget: "#Input", label: "form.mpnLabel"}},
                    {render: "#Field", field: {name: "hsCode", widget: "#Input", label: "form.hsCodeLabel"}},
                    {render: "#Field", field: {name: "countryOfOrigin", widget: "#Input", label: "form.countryOfOriginLabel"}},
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
                    {render: "#Field", field: {name: "price", widget: "#Input", label: "form.priceLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "compareAtPrice", widget: "#Input", label: "form.compareAtPriceLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "costPrice", widget: "#Input", label: "form.costPriceLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "msrp", widget: "#Input", label: "form.msrpLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "currency", widget: "#ApiSelect", label: "form.currencyLabel", widgetProps: {apiUrl: "/api/finance/currency/select", method: "GET", normalizeEmptyToUndefined: true}}},
                    {render: "#Field", field: {name: "taxClass", widget: "#Input", label: "form.taxClassLabel"}},
                    {render: "#Field", field: {name: "taxable", widget: "#Checkbox", label: "form.taxableLabel"}},
                    {render: "#Field", field: {name: "saleStartsAt", widget: "#DateInput", label: "form.saleStartsAtLabel", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", field: {name: "saleEndsAt", widget: "#DateInput", label: "form.saleEndsAtLabel", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", field: {name: "minOrderQty", widget: "#Input", label: "form.minOrderQtyLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "maxOrderQty", widget: "#Input", label: "form.maxOrderQtyLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "stepQty", widget: "#Input", label: "form.stepQtyLabel", widgetProps: {type: "number", min: 0}}},
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
                    {render: "#Field", field: {name: "trackInventory", widget: "#Checkbox", label: "form.trackInventoryLabel"}},
                    {render: "#Field", field: {name: "allowBackorder", widget: "#Checkbox", label: "form.allowBackorderLabel"}},
                    {render: "#Field", field: {name: "lowStockThreshold", widget: "#Input", label: "form.lowStockThresholdLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "safetyStock", widget: "#Input", label: "form.safetyStockLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "backorderLimit", widget: "#Input", label: "form.backorderLimitLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "preorderEnabled", widget: "#Checkbox", label: "form.preorderEnabledLabel"}},
                    {render: "#Field", field: {name: "preorderAvailableAt", widget: "#DateInput", label: "form.preorderAvailableAtLabel", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
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
                    {render: "#Field", field: {name: "weight", widget: "#Input", label: "form.weightLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "weightUnit", widget: "#Select", label: "form.weightUnitLabel", widgetProps: {options: weightUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "dimensions.length", widget: "#Input", label: "form.dimensionLengthLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.width", widget: "#Input", label: "form.dimensionWidthLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.height", widget: "#Input", label: "form.dimensionHeightLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensionUnit", widget: "#Select", label: "form.dimensionUnitLabel", widgetProps: {options: dimensionUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "volumetricWeight", widget: "#Input", label: "form.volumetricWeightLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "shippingClass", widget: "#Input", label: "form.shippingClassLabel"}},
                    {render: "#Field", field: {name: "isHazmat", widget: "#Checkbox", label: "form.isHazmatLabel"}},
                    {render: "#Field", field: {name: "requiresShipping", widget: "#Checkbox", label: "form.requiresShippingLabel"}},
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
            {render: "#Field", field: {name: "hasVariants", widget: "#Checkbox", label: "form.hasVariantsLabel"}},
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

    // ── Media ──────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mainImageLabel"},
        children: [
            {render: "#Field", field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel", widgetProps: {mediaType: "image", mode: "single"}}},
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.galleryLabel"},
        children: [
            {render: "#Field", field: {name: "gallery", widget: "#MediaField", label: "form.galleryLabel", widgetProps: {mediaType: "image", mode: "multiple", maxCount: 20}}},
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.documentsLabel"},
        children: [
            {render: "#Field", field: {name: "documents", widget: "#MediaField", label: "form.documentsLabel", widgetProps: {mediaType: "file", mode: "multiple", maxCount: 20}}},
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.videoUrlsSectionTitle"},
        children: [
            {render: "#Field", field: {name: "videoUrls", widget: "#StringArrayField", label: "form.videoUrlsLabel", placeholder: "form.videoUrlPlaceholder", widgetProps: {removeTooltipKey: "form.removeVideoUrl"}}},
        ],
    },

    // ── Content ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.contentSectionTitle"},
        children: [
            {render: "#Field", field: {name: "highlights", widget: "#StringArrayField", label: "form.highlightsLabel", widgetProps: {removeTooltipKey: "form.removeHighlight"}}},
            {render: "#Field", field: {name: "careInstructions", widget: "#Textarea", label: "form.careInstructionsLabel", widgetProps: {rows: 3}}},
            {render: "#Field", field: {name: "warranty", widget: "#Input", label: "form.warrantyLabel"}},
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
                                    {render: "#Field", field: {name: "question", widget: "#Input", label: "form.faqQuestionLabel", required: true}},
                                    {render: "#Field", field: {name: "answer", widget: "#Textarea", label: "form.faqAnswerLabel", required: true, widgetProps: {rows: 3}}},
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
                                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.attributeNameLabel", required: true}},
                                    {render: "#Field", field: {name: "values", widget: "#StringArrayField", label: "form.attributeValuesLabel", widgetProps: {removeTooltipKey: "form.removeValue"}}},
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
                                render: "#FormGrid",
                                props: {columns: 2},
                                children: [
                                    {render: "#Field", field: {name: "label", widget: "#Input", label: "form.specLabelLabel", required: true}},
                                    {render: "#Field", field: {name: "value", widget: "#Input", label: "form.specValueLabel", required: true}},
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
            {render: "#Field", field: {name: "badges", widget: "#StringArrayField", label: "form.badgesLabel", widgetProps: {removeTooltipKey: "form.removeBadge"}}},
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
                    {render: "#Field", field: {name: "seo.metaTitle", widget: "#Input", label: "form.seoMetaTitleLabel"}},
                    {render: "#Field", field: {name: "seo.canonicalUrl", widget: "#Input", label: "form.seoCanonicalUrlLabel"}},
                    {render: "#Field", field: {name: "seo.openGraphTitle", widget: "#Input", label: "form.seoOpenGraphTitleLabel"}},
                    {render: "#Field", field: {name: "seo.structuredDataType", widget: "#Input", label: "form.seoStructuredDataTypeLabel"}},
                    {render: "#Field", field: {name: "seo.twitterCard", widget: "#Select", label: "form.seoTwitterCardLabel", widgetProps: {options: twitterCardOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "seo.sitemapPriority", widget: "#Input", label: "form.seoSitemapPriorityLabel", widgetProps: {type: "number", min: 0, max: 1, step: 0.1}}},
                    {render: "#Field", field: {name: "seo.sitemapInclude", widget: "#Checkbox", label: "form.seoSitemapIncludeLabel"}},
                    {render: "#Field", field: {name: "seo.noIndex", widget: "#Checkbox", label: "form.seoNoIndexLabel"}},
                ],
            },
            {render: "#Field", field: {name: "seo.metaDescription", widget: "#Textarea", label: "form.seoMetaDescriptionLabel", widgetProps: {rows: 3}}},
            {render: "#Field", field: {name: "seo.openGraphDescription", widget: "#Textarea", label: "form.seoOpenGraphDescriptionLabel", widgetProps: {rows: 3}}},
            {render: "#Field", field: {name: "seo.metaKeywords", widget: "#StringArrayField", label: "form.seoMetaKeywordsLabel", widgetProps: {removeTooltipKey: "form.removeKeyword"}}},
        ],
    },
];

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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconPackage", languageKeyCategory: "productType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "status"}, field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "productStatus"}}},
                        {render: "#SmallInfoCard", permissions: {read: "sku"}, field: {name: "sku", widget: "#SmallInfoCard", label: "sku", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#SmallInfoCard", permissions: {read: "price"}, field: {name: "price", widget: "#SmallInfoCard", label: "price", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "brand"}, field: {name: "brand", widget: "#SmallInfoCard", label: "brand", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "featured"}, field: {name: "featured", widget: "#SmallInfoCard", label: "featured", widgetProps: {icon: "#IconStar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "ratingAverage"}, field: {name: "ratingAverage", widget: "#SmallInfoCard", label: "ratingAverage", widgetProps: {icon: "#IconStar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "reviewCount"}, field: {name: "reviewCount", widget: "#SmallInfoCard", label: "reviewCount", widgetProps: {icon: "#Hash"}}},
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
