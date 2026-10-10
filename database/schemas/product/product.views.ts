import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {
    PRODUCT_TITLE_MAX,
    PRODUCT_SLUG_MAX,
    PRODUCT_DESCRIPTION_MAX,
    PRODUCT_SKU_MAX,
    PRODUCT_CODE_MAX,
    PRODUCT_URL_MAX,
    PRODUCT_META_TITLE_MAX,
    PRODUCT_META_DESCRIPTION_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";

const productTypeOptions = [
    {value: "physical", label: "form.productType.physical"},
    {value: "digital", label: "form.productType.digital"},
    {value: "service", label: "form.productType.service"},
    {value: "variable", label: "form.productType.variable"},
    {value: "bundle", label: "form.productType.bundle"},
    {value: "gift_card", label: "form.productType.gift_card"},
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
        widget: "#ObjectIdChipsInput",
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
                    {render: "#Field", field: {name: "title", widget: "#Input", label: "form.titleLabel", placeholder: "form.titlePlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                    {render: "#Field", field: {name: "slug", widget: "#Input", label: "form.slugLabel", placeholder: "form.slugPlaceholder", widgetProps: {maxLength: PRODUCT_SLUG_MAX}}},
                    {render: "#Field", field: {name: "type", widget: "#SimpleSelect", label: "form.typeLabel", placeholder: "form.typePlaceholder", required: true, widgetProps: {options: productTypeOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "publishedAt", widget: "#DateInput", label: "form.publishedAtLabel", placeholder: "form.publishedAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", field: {name: "brand", widget: "#Input", label: "form.brandLabel", placeholder: "form.brandPlaceholder", widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                    {render: "#Field", field: {name: "vendor", widget: "#Input", label: "form.vendorLabel", placeholder: "form.vendorPlaceholder", widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                    {render: "#Field", field: {name: "featured", widget: "#Switch", label: "form.featuredLabel"}},
                    {render: "#Field", field: {name: "availableForSale", widget: "#Switch", label: "form.availableForSaleLabel"}},
                ],
            },
            {render: "#Field", field: {name: "shortDescription", widget: "#Textarea", label: "form.shortDescriptionLabel", placeholder: "form.shortDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {render: "#Field", field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", placeholder: "form.descriptionPlaceholder", widgetProps: {rows: 6, className: "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {render: "#Field", field: {name: "tags", widget: "#StringArrayInput", label: "form.tagsLabel", placeholder: "form.tagsPlaceholder", widgetProps: {removeTooltipKey: "form.removeTag", maxLength: PRODUCT_TITLE_MAX}}},
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
                    {render: "#Field", field: {name: "sku", widget: "#Input", label: "form.skuLabel", placeholder: "form.skuPlaceholder", widgetProps: {maxLength: PRODUCT_SKU_MAX}}},
                    {render: "#Field", field: {name: "barcode", widget: "#Input", label: "form.barcodeLabel", placeholder: "form.barcodePlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "gtin", widget: "#Input", label: "form.gtinLabel", placeholder: "form.gtinPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "upc", widget: "#Input", label: "form.upcLabel", placeholder: "form.upcPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "ean", widget: "#Input", label: "form.eanLabel", placeholder: "form.eanPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "isbn", widget: "#Input", label: "form.isbnLabel", placeholder: "form.isbnPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "mpn", widget: "#Input", label: "form.mpnLabel", placeholder: "form.mpnPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "hsCode", widget: "#Input", label: "form.hsCodeLabel", placeholder: "form.hsCodePlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "countryOfOrigin", widget: "#Input", label: "form.countryOfOriginLabel", placeholder: "form.countryOfOriginPlaceholder", widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
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
                    {render: "#Field", field: {name: "taxClass", widget: "#Input", label: "form.taxClassLabel", placeholder: "form.taxClassPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
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
                    {render: "#Field", field: {name: "weightUnit", widget: "#SimpleSelect", label: "form.weightUnitLabel", placeholder: "form.weightUnitPlaceholder", widgetProps: {options: weightUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "dimensions.length", widget: "#Input", label: "form.dimensionLengthLabel", placeholder: "form.dimensionLengthPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.width", widget: "#Input", label: "form.dimensionWidthLabel", placeholder: "form.dimensionWidthPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensions.height", widget: "#Input", label: "form.dimensionHeightLabel", placeholder: "form.dimensionHeightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "dimensionUnit", widget: "#SimpleSelect", label: "form.dimensionUnitLabel", placeholder: "form.dimensionUnitPlaceholder", widgetProps: {options: dimensionUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "volumetricWeight", widget: "#Input", label: "form.volumetricWeightLabel", placeholder: "form.volumetricWeightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "shippingClass", widget: "#Input", label: "form.shippingClassLabel", placeholder: "form.shippingClassPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
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
                    widget: "#ObjectIdChipsInput",
                    label: "form.categoriesLabel",
                    widgetProps: {apiUrl: "/api/eCommerce/category/select", method: "POST", placeholderKey: "form.selectCategory", removeTooltipKey: "form.removeCategory", selectPageSizeCreate: 50, selectPageSizeEdit: 200, labelRefFormExtraKey: "categories"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "collections",
                    widget: "#ObjectIdChipsInput",
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
                    widget: "#ObjectIdChipsInput",
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
            {render: "#Field", field: {name: "videoUrls", widget: "#StringArrayInput", label: "form.videoUrlsLabel", placeholder: "form.videoUrlPlaceholder", widgetProps: {removeTooltipKey: "form.removeVideoUrl", maxLength: PRODUCT_URL_MAX}}},
        ],
    },

    // ── Content ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.contentSectionTitle"},
        children: [
            {render: "#Field", field: {name: "highlights", widget: "#StringArrayInput", label: "form.highlightsLabel", placeholder: "form.highlightsPlaceholder", widgetProps: {removeTooltipKey: "form.removeHighlight", maxLength: PRODUCT_TITLE_MAX}}},
            {render: "#Field", field: {name: "careInstructions", widget: "#Textarea", label: "form.careInstructionsLabel", placeholder: "form.careInstructionsPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {render: "#Field", field: {name: "warranty", widget: "#Input", label: "form.warrantyLabel", placeholder: "form.warrantyPlaceholder", widgetProps: {maxLength: PRODUCT_DESCRIPTION_MAX}}},
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
                                    {render: "#Field", field: {name: "question", widget: "#Input", label: "form.faqQuestionLabel", placeholder: "form.faqQuestionPlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                                    {render: "#Field", field: {name: "answer", widget: "#Textarea", label: "form.faqAnswerLabel", placeholder: "form.faqAnswerPlaceholder", required: true, widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
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
                                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.attributeNameLabel", placeholder: "form.attributeNamePlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                                    {render: "#Field", field: {name: "values", widget: "#StringArrayInput", label: "form.attributeValuesLabel", placeholder: "form.attributeValuesPlaceholder", widgetProps: {removeTooltipKey: "form.removeValue", maxLength: PRODUCT_TITLE_MAX}}},
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
                                    {render: "#Field", field: {name: "label", widget: "#Input", label: "form.specLabelLabel", placeholder: "form.specLabelPlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                                    {render: "#Field", field: {name: "value", widget: "#Input", label: "form.specValueLabel", placeholder: "form.specValuePlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
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
            {render: "#Field", field: {name: "badges", widget: "#StringArrayInput", label: "form.badgesLabel", placeholder: "form.badgesPlaceholder", widgetProps: {removeTooltipKey: "form.removeBadge", maxLength: PRODUCT_CODE_MAX}}},
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
                    {render: "#Field", field: {name: "seo.metaTitle", widget: "#Input", label: "form.seoMetaTitleLabel", placeholder: "form.seoMetaTitlePlaceholder", widgetProps: {maxLength: PRODUCT_META_TITLE_MAX}}},
                    {render: "#Field", field: {name: "seo.canonicalUrl", widget: "#Input", label: "form.seoCanonicalUrlLabel", placeholder: "form.seoCanonicalUrlPlaceholder", widgetProps: {maxLength: PRODUCT_URL_MAX}}},
                    {render: "#Field", field: {name: "seo.openGraphTitle", widget: "#Input", label: "form.seoOpenGraphTitleLabel", placeholder: "form.seoOpenGraphTitlePlaceholder", widgetProps: {maxLength: PRODUCT_META_TITLE_MAX}}},
                    {render: "#Field", field: {name: "seo.structuredDataType", widget: "#Input", label: "form.seoStructuredDataTypeLabel", placeholder: "form.seoStructuredDataTypePlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", field: {name: "seo.twitterCard", widget: "#SimpleSelect", label: "form.seoTwitterCardLabel", placeholder: "form.seoTwitterCardPlaceholder", widgetProps: {options: twitterCardOptions, className: "grow w-full"}}},
                    {render: "#Field", field: {name: "seo.sitemapPriority", widget: "#Input", label: "form.seoSitemapPriorityLabel", placeholder: "form.seoSitemapPriorityPlaceholder", widgetProps: {type: "number", min: 0, max: 1, step: 0.1}}},
                    {render: "#Field", field: {name: "seo.sitemapInclude", widget: "#Switch", label: "form.seoSitemapIncludeLabel"}},
                    {render: "#Field", field: {name: "seo.noIndex", widget: "#Switch", label: "form.seoNoIndexLabel"}},
                ],
            },
            {render: "#Field", field: {name: "seo.metaDescription", widget: "#Textarea", label: "form.seoMetaDescriptionLabel", placeholder: "form.seoMetaDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_META_DESCRIPTION_MAX}}},
            {render: "#Field", field: {name: "seo.openGraphDescription", widget: "#Textarea", label: "form.seoOpenGraphDescriptionLabel", placeholder: "form.seoOpenGraphDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_META_DESCRIPTION_MAX}}},
            {render: "#Field", field: {name: "seo.metaKeywords", widget: "#StringArrayInput", label: "form.seoMetaKeywordsLabel", placeholder: "form.seoMetaKeywordsPlaceholder", widgetProps: {removeTooltipKey: "form.removeKeyword", maxLength: PRODUCT_TITLE_MAX}}},
        ],
    },

];

const productEditChip = (name: string) => ({
    ...productChip(name),
    permissions: {read: name, write: name},
});

const productEditFormNodes: ViewConfig["nodes"] = [
    // ── General ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {writeAny: ["title","slug","type","publishedAt","brand","vendor","featured","availableForSale","shortDescription","description","tags"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "title", write: "title"}, field: {name: "title", widget: "#Input", label: "form.titleLabel", placeholder: "form.titlePlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                    {render: "#Field", permissions: {read: "slug", write: "slug"}, field: {name: "slug", widget: "#Input", label: "form.slugLabel", placeholder: "form.slugPlaceholder", widgetProps: {maxLength: PRODUCT_SLUG_MAX}}},
                    {render: "#Field", permissions: {read: "type", write: "type"}, field: {name: "type", widget: "#SimpleSelect", label: "form.typeLabel", placeholder: "form.typePlaceholder", required: true, widgetProps: {options: productTypeOptions, className: "grow w-full"}}},
                    {render: "#Field", permissions: {read: "publishedAt", write: "publishedAt"}, field: {name: "publishedAt", widget: "#DateInput", label: "form.publishedAtLabel", placeholder: "form.publishedAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", permissions: {read: "brand", write: "brand"}, field: {name: "brand", widget: "#Input", label: "form.brandLabel", placeholder: "form.brandPlaceholder", widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                    {render: "#Field", permissions: {read: "vendor", write: "vendor"}, field: {name: "vendor", widget: "#Input", label: "form.vendorLabel", placeholder: "form.vendorPlaceholder", widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                    {render: "#Field", permissions: {read: "featured", write: "featured"}, field: {name: "featured", widget: "#Switch", label: "form.featuredLabel"}},
                    {render: "#Field", permissions: {read: "availableForSale", write: "availableForSale"}, field: {name: "availableForSale", widget: "#Switch", label: "form.availableForSaleLabel"}},
                ],
            },
            {render: "#Field", permissions: {read: "shortDescription", write: "shortDescription"}, field: {name: "shortDescription", widget: "#Textarea", label: "form.shortDescriptionLabel", placeholder: "form.shortDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {render: "#Field", permissions: {read: "description", write: "description"}, field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", placeholder: "form.descriptionPlaceholder", widgetProps: {rows: 6, className: "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {render: "#Field", permissions: {read: "tags", write: "tags"}, field: {name: "tags", widget: "#StringArrayInput", label: "form.tagsLabel", placeholder: "form.tagsPlaceholder", widgetProps: {removeTooltipKey: "form.removeTag", maxLength: PRODUCT_TITLE_MAX}}},
        ],
    },

    // ── Identifiers ────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.identifiersSectionTitle"},
        permissions: {writeAny: ["sku","barcode","gtin","upc","ean","isbn","mpn","hsCode","countryOfOrigin"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "sku", write: "sku"}, field: {name: "sku", widget: "#Input", label: "form.skuLabel", placeholder: "form.skuPlaceholder", widgetProps: {maxLength: PRODUCT_SKU_MAX}}},
                    {render: "#Field", permissions: {read: "barcode", write: "barcode"}, field: {name: "barcode", widget: "#Input", label: "form.barcodeLabel", placeholder: "form.barcodePlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "gtin", write: "gtin"}, field: {name: "gtin", widget: "#Input", label: "form.gtinLabel", placeholder: "form.gtinPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "upc", write: "upc"}, field: {name: "upc", widget: "#Input", label: "form.upcLabel", placeholder: "form.upcPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "ean", write: "ean"}, field: {name: "ean", widget: "#Input", label: "form.eanLabel", placeholder: "form.eanPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "isbn", write: "isbn"}, field: {name: "isbn", widget: "#Input", label: "form.isbnLabel", placeholder: "form.isbnPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "mpn", write: "mpn"}, field: {name: "mpn", widget: "#Input", label: "form.mpnLabel", placeholder: "form.mpnPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "hsCode", write: "hsCode"}, field: {name: "hsCode", widget: "#Input", label: "form.hsCodeLabel", placeholder: "form.hsCodePlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "countryOfOrigin", write: "countryOfOrigin"}, field: {name: "countryOfOrigin", widget: "#Input", label: "form.countryOfOriginLabel", placeholder: "form.countryOfOriginPlaceholder", widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                ],
            },
        ],
    },

    // ── Pricing ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.pricingSectionTitle"},
        permissions: {writeAny: ["price","compareAtPrice","costPrice","msrp","currency","saleStartsAt","saleEndsAt","minOrderQty","maxOrderQty","stepQty","taxable","taxClass"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "price", write: "price"}, field: {name: "price", widget: "#Input", label: "form.priceLabel", placeholder: "form.pricePlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "compareAtPrice", write: "compareAtPrice"}, field: {name: "compareAtPrice", widget: "#Input", label: "form.compareAtPriceLabel", placeholder: "form.compareAtPricePlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "costPrice", write: "costPrice"}, field: {name: "costPrice", widget: "#Input", label: "form.costPriceLabel", placeholder: "form.costPricePlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "msrp", write: "msrp"}, field: {name: "msrp", widget: "#Input", label: "form.msrpLabel", placeholder: "form.msrpPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "currency", write: "currency"}, field: {name: "currency", widget: "#ApiSelect", label: "form.currencyLabel", placeholder: "form.currencyPlaceholder", widgetProps: {apiUrl: "/api/finance/currency/select", method: "GET", normalizeEmptyToUndefined: true, defaultOptionsFormExtraKey: "currencyDefaultOptions"}}},
                    {render: "#Field", permissions: {read: "saleStartsAt", write: "saleStartsAt"}, field: {name: "saleStartsAt", widget: "#DateInput", label: "form.saleStartsAtLabel", placeholder: "form.saleStartsAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", permissions: {read: "saleEndsAt", write: "saleEndsAt"}, field: {name: "saleEndsAt", widget: "#DateInput", label: "form.saleEndsAtLabel", placeholder: "form.saleEndsAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                    {render: "#Field", permissions: {read: "minOrderQty", write: "minOrderQty"}, field: {name: "minOrderQty", widget: "#Input", label: "form.minOrderQtyLabel", placeholder: "form.minOrderQtyPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "maxOrderQty", write: "maxOrderQty"}, field: {name: "maxOrderQty", widget: "#Input", label: "form.maxOrderQtyLabel", placeholder: "form.maxOrderQtyPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "stepQty", write: "stepQty"}, field: {name: "stepQty", widget: "#Input", label: "form.stepQtyLabel", placeholder: "form.stepQtyPlaceholder", widgetProps: {type: "number", min: 0}}},
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "taxable", write: "taxable"}, field: {name: "taxable", widget: "#Switch", label: "form.taxableLabel"}},
                    {render: "#Field", permissions: {read: "taxClass", write: "taxClass"}, field: {name: "taxClass", widget: "#Input", label: "form.taxClassLabel", placeholder: "form.taxClassPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                ],
            },
        ],
    },

    // ── Inventory ──────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.inventorySectionTitle"},
        permissions: {writeAny: ["trackInventory","allowBackorder","lowStockThreshold","safetyStock","backorderLimit","preorderEnabled","preorderAvailableAt"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "trackInventory", write: "trackInventory"}, field: {name: "trackInventory", widget: "#Switch", label: "form.trackInventoryLabel"}},
                    {render: "#Field", permissions: {read: "allowBackorder", write: "allowBackorder"}, field: {name: "allowBackorder", widget: "#Switch", label: "form.allowBackorderLabel"}},
                    {render: "#Field", permissions: {read: "lowStockThreshold", write: "lowStockThreshold"}, field: {name: "lowStockThreshold", widget: "#Input", label: "form.lowStockThresholdLabel", placeholder: "form.lowStockThresholdPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "safetyStock", write: "safetyStock"}, field: {name: "safetyStock", widget: "#Input", label: "form.safetyStockLabel", placeholder: "form.safetyStockPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "backorderLimit", write: "backorderLimit"}, field: {name: "backorderLimit", widget: "#Input", label: "form.backorderLimitLabel", placeholder: "form.backorderLimitPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "preorderEnabled", write: "preorderEnabled"}, field: {name: "preorderEnabled", widget: "#Switch", label: "form.preorderEnabledLabel"}},
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {watchField: "preorderEnabled", whenValues: ["true"], clearFields: ["preorderAvailableAt"]},
                children: [
                    {render: "#Field", permissions: {read: "preorderAvailableAt", write: "preorderAvailableAt"}, field: {name: "preorderAvailableAt", widget: "#DateInput", label: "form.preorderAvailableAtLabel", placeholder: "form.preorderAvailableAtPlaceholder", widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"}}},
                ],
            },
        ],
    },

    // ── Shipping ───────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.shippingSectionTitle"},
        permissions: {writeAny: ["weight","weightUnit","dimensions.length","dimensions.width","dimensions.height","dimensionUnit","volumetricWeight","shippingClass","isHazmat","requiresShipping"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "weight", write: "weight"}, field: {name: "weight", widget: "#Input", label: "form.weightLabel", placeholder: "form.weightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "weightUnit", write: "weightUnit"}, field: {name: "weightUnit", widget: "#SimpleSelect", label: "form.weightUnitLabel", placeholder: "form.weightUnitPlaceholder", widgetProps: {options: weightUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", permissions: {read: "dimensions.length", write: "dimensions.length"}, field: {name: "dimensions.length", widget: "#Input", label: "form.dimensionLengthLabel", placeholder: "form.dimensionLengthPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "dimensions.width", write: "dimensions.width"}, field: {name: "dimensions.width", widget: "#Input", label: "form.dimensionWidthLabel", placeholder: "form.dimensionWidthPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "dimensions.height", write: "dimensions.height"}, field: {name: "dimensions.height", widget: "#Input", label: "form.dimensionHeightLabel", placeholder: "form.dimensionHeightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "dimensionUnit", write: "dimensionUnit"}, field: {name: "dimensionUnit", widget: "#SimpleSelect", label: "form.dimensionUnitLabel", placeholder: "form.dimensionUnitPlaceholder", widgetProps: {options: dimensionUnitOptions, className: "grow w-full"}}},
                    {render: "#Field", permissions: {read: "volumetricWeight", write: "volumetricWeight"}, field: {name: "volumetricWeight", widget: "#Input", label: "form.volumetricWeightLabel", placeholder: "form.volumetricWeightPlaceholder", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", permissions: {read: "shippingClass", write: "shippingClass"}, field: {name: "shippingClass", widget: "#Input", label: "form.shippingClassLabel", placeholder: "form.shippingClassPlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "isHazmat", write: "isHazmat"}, field: {name: "isHazmat", widget: "#Switch", label: "form.isHazmatLabel"}},
                    {render: "#Field", permissions: {read: "requiresShipping", write: "requiresShipping"}, field: {name: "requiresShipping", widget: "#Switch", label: "form.requiresShippingLabel"}},
                ],
            },
        ],
    },

    // ── Organization ───────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.organizationSectionTitle"},
        permissions: {writeAny: ["categories","collections"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "categories", write: "categories"},
                field: {
                    name: "categories",
                    widget: "#ObjectIdChipsInput",
                    label: "form.categoriesLabel",
                    widgetProps: {apiUrl: "/api/eCommerce/category/select", method: "POST", placeholderKey: "form.selectCategory", removeTooltipKey: "form.removeCategory", selectPageSizeCreate: 50, selectPageSizeEdit: 200, labelRefFormExtraKey: "categories"},
                },
            },
            {
                render: "#Field",
                permissions: {read: "collections", write: "collections"},
                field: {
                    name: "collections",
                    widget: "#ObjectIdChipsInput",
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
        permissions: {writeAny: ["hasVariants","variantOptions"]},
        children: [
            {render: "#Field", permissions: {read: "hasVariants", write: "hasVariants"}, field: {name: "hasVariants", widget: "#Switch", label: "form.hasVariantsLabel"}},
            {
                render: "#Field",
                permissions: {read: "variantOptions", write: "variantOptions"},
                field: {
                    name: "variantOptions",
                    widget: "#ObjectIdChipsInput",
                    label: "form.variantOptionsLabel",
                    widgetProps: {apiUrl: "/api/eCommerce/productAttribute/select", method: "POST", placeholderKey: "form.selectAttribute", removeTooltipKey: "form.removeAttribute", selectPageSizeCreate: 50, selectPageSizeEdit: 200, labelRefFormExtraKey: "variantOptions"},
                },
            },
        ],
    },

    // ── Bundle components (type "bundle") ─────────────────────
    {
        render: "#FormWhenFieldValueIn",
        permissions: {readAny: ["bundleComponents"], writeAny: ["bundleComponents"]},
        props: {watchField: "type", whenValues: ["bundle"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "bundleComponents", write: "bundleComponents"},
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
                                        permissions: {read: "bundleComponents", write: "bundleComponents"},
                                        field: {
                                            name: "product",
                                            widget: "#ApiSelect",
                                            label: "form.bundleComponentProductLabel",
                                            placeholder: "form.bundleComponentProductPlaceholder",
                                            required: true,
                                            widgetProps: {apiUrl: "/api/eCommerce/product/select", method: "POST", normalizeEmptyToUndefined: true},
                                        },
                                    },
                                    {render: "#Field", permissions: {read: "bundleComponents", write: "bundleComponents"}, field: {name: "quantity", widget: "#Input", label: "form.bundleComponentQuantityLabel", placeholder: "form.bundleComponentQuantityPlaceholder", required: true, widgetProps: {type: "number", min: 1}}},
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
        permissions: {readAny: ["downloadLimit", "downloadExpiryDays"], writeAny: ["downloadLimit", "downloadExpiryDays"]},
        props: {watchField: "type", whenValues: ["digital"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "downloadLimit", write: "downloadLimit"}, field: {name: "downloadLimit", widget: "#Input", label: "form.downloadLimitLabel", placeholder: "form.downloadLimitPlaceholder", widgetProps: {type: "number", min: 1}}},
                    {render: "#Field", permissions: {read: "downloadExpiryDays", write: "downloadExpiryDays"}, field: {name: "downloadExpiryDays", widget: "#Input", label: "form.downloadExpiryDaysLabel", placeholder: "form.downloadExpiryDaysPlaceholder", widgetProps: {type: "number", min: 1}}},
                ],
            },
        ],
    },

    // ── Media ──────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.mediaSectionTitle"},
        permissions: {writeAny: ["mainImage","gallery","documents","videoUrls"]},
        children: [
            {render: "#Field", permissions: {read: "mainImage", write: "mainImage"}, field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel", widgetProps: {mediaType: "image", mode: "single"}}},
            {render: "#Field", permissions: {read: "gallery", write: "gallery"}, field: {name: "gallery", widget: "#MediaField", label: "form.galleryLabel", widgetProps: {mediaType: "image", mode: "multiple", maxCount: 20}}},
            {render: "#Field", permissions: {read: "documents", write: "documents"}, field: {name: "documents", widget: "#MediaField", label: "form.documentsLabel", widgetProps: {mediaType: "file", mode: "multiple", maxCount: 20}}},
            {render: "#Field", permissions: {read: "videoUrls", write: "videoUrls"}, field: {name: "videoUrls", widget: "#StringArrayInput", label: "form.videoUrlsLabel", placeholder: "form.videoUrlPlaceholder", widgetProps: {removeTooltipKey: "form.removeVideoUrl", maxLength: PRODUCT_URL_MAX}}},
        ],
    },

    // ── Content ────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.contentSectionTitle"},
        permissions: {writeAny: ["highlights","careInstructions","warranty","faqs"]},
        children: [
            {render: "#Field", permissions: {read: "highlights", write: "highlights"}, field: {name: "highlights", widget: "#StringArrayInput", label: "form.highlightsLabel", placeholder: "form.highlightsPlaceholder", widgetProps: {removeTooltipKey: "form.removeHighlight", maxLength: PRODUCT_TITLE_MAX}}},
            {render: "#Field", permissions: {read: "careInstructions", write: "careInstructions"}, field: {name: "careInstructions", widget: "#Textarea", label: "form.careInstructionsLabel", placeholder: "form.careInstructionsPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {render: "#Field", permissions: {read: "warranty", write: "warranty"}, field: {name: "warranty", widget: "#Input", label: "form.warrantyLabel", placeholder: "form.warrantyPlaceholder", widgetProps: {maxLength: PRODUCT_DESCRIPTION_MAX}}},
            {
                render: "#Field",
                permissions: {read: "faqs", write: "faqs"},
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
                                    {render: "#Field", permissions: {read: "faqs", write: "faqs"}, field: {name: "question", widget: "#Input", label: "form.faqQuestionLabel", placeholder: "form.faqQuestionPlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                                    {render: "#Field", permissions: {read: "faqs", write: "faqs"}, field: {name: "answer", widget: "#Textarea", label: "form.faqAnswerLabel", placeholder: "form.faqAnswerPlaceholder", required: true, widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_DESCRIPTION_MAX}}},
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
        permissions: {writeAny: ["attributes","specifications"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "attributes", write: "attributes"},
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
                                    {render: "#Field", permissions: {read: "attributes", write: "attributes"}, field: {name: "name", widget: "#Input", label: "form.attributeNameLabel", placeholder: "form.attributeNamePlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                                    {render: "#Field", permissions: {read: "attributes", write: "attributes"}, field: {name: "values", widget: "#StringArrayInput", label: "form.attributeValuesLabel", placeholder: "form.attributeValuesPlaceholder", widgetProps: {removeTooltipKey: "form.removeValue", maxLength: PRODUCT_TITLE_MAX}}},
                                ],
                            },
                        ],
                    },
                },
            },
            {
                render: "#Field",
                permissions: {read: "specifications", write: "specifications"},
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
                                    {render: "#Field", permissions: {read: "specifications", write: "specifications"}, field: {name: "label", widget: "#Input", label: "form.specLabelLabel", placeholder: "form.specLabelPlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
                                    {render: "#Field", permissions: {read: "specifications", write: "specifications"}, field: {name: "value", widget: "#Input", label: "form.specValueLabel", placeholder: "form.specValuePlaceholder", required: true, widgetProps: {maxLength: PRODUCT_TITLE_MAX}}},
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
        permissions: {writeAny: ["relatedProducts","upsells","crossSells","frequentlyBoughtTogether","badges"]},
        children: [
            productEditChip("relatedProducts"),
            productEditChip("upsells"),
            productEditChip("crossSells"),
            productEditChip("frequentlyBoughtTogether"),
            {render: "#Field", permissions: {read: "badges", write: "badges"}, field: {name: "badges", widget: "#StringArrayInput", label: "form.badgesLabel", placeholder: "form.badgesPlaceholder", widgetProps: {removeTooltipKey: "form.removeBadge", maxLength: PRODUCT_CODE_MAX}}},
        ],
    },

    // ── SEO ────────────────────────────────────────────────────
    {
        render: "#TitleWithCollapse",
        props: {title: "form.seoSectionTitle"},
        permissions: {writeAny: ["seo.metaTitle","seo.canonicalUrl","seo.openGraphTitle","seo.structuredDataType","seo.twitterCard","seo.sitemapPriority","seo.sitemapInclude","seo.noIndex","seo.metaDescription","seo.openGraphDescription","seo.metaKeywords"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", permissions: {read: "seo.metaTitle", write: "seo.metaTitle"}, field: {name: "seo.metaTitle", widget: "#Input", label: "form.seoMetaTitleLabel", placeholder: "form.seoMetaTitlePlaceholder", widgetProps: {maxLength: PRODUCT_META_TITLE_MAX}}},
                    {render: "#Field", permissions: {read: "seo.canonicalUrl", write: "seo.canonicalUrl"}, field: {name: "seo.canonicalUrl", widget: "#Input", label: "form.seoCanonicalUrlLabel", placeholder: "form.seoCanonicalUrlPlaceholder", widgetProps: {maxLength: PRODUCT_URL_MAX}}},
                    {render: "#Field", permissions: {read: "seo.openGraphTitle", write: "seo.openGraphTitle"}, field: {name: "seo.openGraphTitle", widget: "#Input", label: "form.seoOpenGraphTitleLabel", placeholder: "form.seoOpenGraphTitlePlaceholder", widgetProps: {maxLength: PRODUCT_META_TITLE_MAX}}},
                    {render: "#Field", permissions: {read: "seo.structuredDataType", write: "seo.structuredDataType"}, field: {name: "seo.structuredDataType", widget: "#Input", label: "form.seoStructuredDataTypeLabel", placeholder: "form.seoStructuredDataTypePlaceholder", widgetProps: {maxLength: PRODUCT_CODE_MAX}}},
                    {render: "#Field", permissions: {read: "seo.twitterCard", write: "seo.twitterCard"}, field: {name: "seo.twitterCard", widget: "#SimpleSelect", label: "form.seoTwitterCardLabel", placeholder: "form.seoTwitterCardPlaceholder", widgetProps: {options: twitterCardOptions, className: "grow w-full"}}},
                    {render: "#Field", permissions: {read: "seo.sitemapPriority", write: "seo.sitemapPriority"}, field: {name: "seo.sitemapPriority", widget: "#Input", label: "form.seoSitemapPriorityLabel", placeholder: "form.seoSitemapPriorityPlaceholder", widgetProps: {type: "number", min: 0, max: 1, step: 0.1}}},
                    {render: "#Field", permissions: {read: "seo.sitemapInclude", write: "seo.sitemapInclude"}, field: {name: "seo.sitemapInclude", widget: "#Switch", label: "form.seoSitemapIncludeLabel"}},
                    {render: "#Field", permissions: {read: "seo.noIndex", write: "seo.noIndex"}, field: {name: "seo.noIndex", widget: "#Switch", label: "form.seoNoIndexLabel"}},
                ],
            },
            {render: "#Field", permissions: {read: "seo.metaDescription", write: "seo.metaDescription"}, field: {name: "seo.metaDescription", widget: "#Textarea", label: "form.seoMetaDescriptionLabel", placeholder: "form.seoMetaDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_META_DESCRIPTION_MAX}}},
            {render: "#Field", permissions: {read: "seo.openGraphDescription", write: "seo.openGraphDescription"}, field: {name: "seo.openGraphDescription", widget: "#Textarea", label: "form.seoOpenGraphDescriptionLabel", placeholder: "form.seoOpenGraphDescriptionPlaceholder", widgetProps: {rows: 3, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto", maxLength: PRODUCT_META_DESCRIPTION_MAX}}},
            {render: "#Field", permissions: {read: "seo.metaKeywords", write: "seo.metaKeywords"}, field: {name: "seo.metaKeywords", widget: "#StringArrayInput", label: "form.seoMetaKeywordsLabel", placeholder: "form.seoMetaKeywordsPlaceholder", widgetProps: {removeTooltipKey: "form.removeKeyword", maxLength: PRODUCT_TITLE_MAX}}},
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
                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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

const runtimeChildSheetGroup = (
    title: string,
    field: string,
    storageKey: string,
    cardWidget: string,
    itemDataProp: string,
    compactRow: Record<string, unknown>,
): NonNullable<ViewConfig["nodes"]>[number] => ({
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
            dependentRuntimeOnly: true,
            children: [
                {
                    render: "div",
                    props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ReferencesRender",
                            field: {
                                name: field,
                                widget: "#ReferencesRender",
                                widgetProps: {
                                    cardWidget,
                                    itemDataProp,
                                    pageSize: 3,
                                    hideActions: true,
                                    compactRow,
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
                        {render: "#DisplayCard", permissions: {read: "type"}, field: {name: "type", widget: "#DisplayCard", label: "type", widgetProps: {icon: "#IconPackage", languageKeyCategory: "productType", type: "enum"}}},
                        {render: "#DisplayCard", permissions: {read: "status"}, field: {name: "status", widget: "#DisplayCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "productStatus", type: "enum"}}},
                        {render: "#DisplayCard", permissions: {read: "slug"}, field: {name: "slug", widget: "#DisplayCard", label: "slug", widgetProps: {icon: "#IconLink"}}},
                        {render: "#DisplayCard", permissions: {read: "sku"}, field: {name: "sku", widget: "#DisplayCard", label: "sku", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "brand"}, field: {name: "brand", widget: "#DisplayCard", label: "brand", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "vendor"}, field: {name: "vendor", widget: "#DisplayCard", label: "vendor", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#DisplayCard", permissions: {read: "featured"}, field: {name: "featured", widget: "#DisplayCard", label: "featured", widgetProps: {icon: "#IconStar", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "availableForSale"}, field: {name: "availableForSale", widget: "#DisplayCard", label: "availableForSale", widgetProps: {icon: "#IconShoppingCart", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "ratingAverage"}, field: {name: "ratingAverage", widget: "#DisplayCard", label: "ratingAverage", widgetProps: {icon: "#IconStar", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "reviewCount"}, field: {name: "reviewCount", widget: "#DisplayCard", label: "reviewCount", widgetProps: {icon: "#Hash"}}},
                        {render: "#DisplayCard", permissions: {read: "variantCount"}, field: {name: "variantCount", widget: "#DisplayCard", label: "variantCount", widgetProps: {icon: "#Hash"}}},
                        {render: "#DisplayCard", permissions: {read: "publishedAt"}, field: {name: "publishedAt", widget: "#DisplayCard", label: "publishedAt", widgetProps: {icon: "#IconCalendar", format: "dateTime", type: "dateTime"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "tags"},
                            field: {name: "tags", widget: "#DisplayCard", label: "tags", widgetProps: {icon: "#IconTags", valueType: "stringBadgeList"}},
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
                        {render: "#DisplayCard", permissions: {read: "barcode"}, field: {name: "barcode", widget: "#DisplayCard", label: "barcode", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "gtin"}, field: {name: "gtin", widget: "#DisplayCard", label: "gtin", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "upc"}, field: {name: "upc", widget: "#DisplayCard", label: "upc", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "ean"}, field: {name: "ean", widget: "#DisplayCard", label: "ean", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "isbn"}, field: {name: "isbn", widget: "#DisplayCard", label: "isbn", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "mpn"}, field: {name: "mpn", widget: "#DisplayCard", label: "mpn", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "hsCode"}, field: {name: "hsCode", widget: "#DisplayCard", label: "hsCode", widgetProps: {icon: "#IconWorld"}}},
                        {render: "#DisplayCard", permissions: {read: "countryOfOrigin"}, field: {name: "countryOfOrigin", widget: "#DisplayCard", label: "countryOfOrigin", widgetProps: {icon: "#IconWorld"}}},
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
                        {render: "#DisplayCard", permissions: {read: "price"}, field: {name: "price", widget: "#DisplayCard", label: "price", widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "compareAtPrice"}, field: {name: "compareAtPrice", widget: "#DisplayCard", label: "compareAtPrice", widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "costPrice"}, field: {name: "costPrice", widget: "#DisplayCard", label: "costPrice", widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "msrp"}, field: {name: "msrp", widget: "#DisplayCard", label: "msrp", widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"}}},
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
                        {render: "#DisplayCard", permissions: {read: "taxable"}, field: {name: "taxable", widget: "#DisplayCard", label: "taxable", widgetProps: {icon: "#IconReceiptTax", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "taxClass"}, field: {name: "taxClass", widget: "#DisplayCard", label: "taxClass", widgetProps: {icon: "#IconReceiptTax"}}},
                        {render: "#DisplayCard", permissions: {read: "saleStartsAt"}, field: {name: "saleStartsAt", widget: "#DisplayCard", label: "saleStartsAt", widgetProps: {icon: "#IconCalendar", format: "dateTime", type: "dateTime"}}},
                        {render: "#DisplayCard", permissions: {read: "saleEndsAt"}, field: {name: "saleEndsAt", widget: "#DisplayCard", label: "saleEndsAt", widgetProps: {icon: "#IconCalendar", format: "dateTime", type: "dateTime"}}},
                        {render: "#DisplayCard", permissions: {read: "minOrderQty"}, field: {name: "minOrderQty", widget: "#DisplayCard", label: "minOrderQty", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "maxOrderQty"}, field: {name: "maxOrderQty", widget: "#DisplayCard", label: "maxOrderQty", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "stepQty"}, field: {name: "stepQty", widget: "#DisplayCard", label: "stepQty", widgetProps: {icon: "#Hash", format: "locale"}}},
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
                        {render: "#DisplayCard", permissions: {read: "trackInventory"}, field: {name: "trackInventory", widget: "#DisplayCard", label: "trackInventory", widgetProps: {icon: "#IconToggleRight", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "allowBackorder"}, field: {name: "allowBackorder", widget: "#DisplayCard", label: "allowBackorder", widgetProps: {icon: "#IconPackageOff", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "lowStockThreshold"}, field: {name: "lowStockThreshold", widget: "#DisplayCard", label: "lowStockThreshold", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "safetyStock"}, field: {name: "safetyStock", widget: "#DisplayCard", label: "safetyStock", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "backorderLimit"}, field: {name: "backorderLimit", widget: "#DisplayCard", label: "backorderLimit", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "preorderEnabled"}, field: {name: "preorderEnabled", widget: "#DisplayCard", label: "preorderEnabled", widgetProps: {icon: "#IconClock", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "preorderAvailableAt"}, field: {name: "preorderAvailableAt", widget: "#DisplayCard", label: "preorderAvailableAt", widgetProps: {icon: "#IconCalendar", format: "dateTime", type: "dateTime"}}},
                        {render: "#DisplayCard", permissions: {read: "downloadLimit"}, field: {name: "downloadLimit", widget: "#DisplayCard", label: "downloadLimit", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "downloadExpiryDays"}, field: {name: "downloadExpiryDays", widget: "#DisplayCard", label: "downloadExpiryDays", widgetProps: {icon: "#IconCalendar", format: "locale"}}},
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
                        {render: "#DisplayCard", permissions: {read: "weight"}, field: {name: "weight", widget: "#DisplayCard", label: "weight", widgetProps: {icon: "#IconWeight", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "weightUnit"}, field: {name: "weightUnit", widget: "#DisplayCard", label: "weightUnit", widgetProps: {icon: "#IconWeight", languageKeyCategory: "weightUnits", type: "enum"}}},
                        {render: "#DisplayCard", permissions: {read: "dimensions"}, field: {name: "dimensions.length", widget: "#DisplayCard", label: "dimensionLength", widgetProps: {icon: "#IconRuler", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "dimensions"}, field: {name: "dimensions.width", widget: "#DisplayCard", label: "dimensionWidth", widgetProps: {icon: "#IconRuler", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "dimensions"}, field: {name: "dimensions.height", widget: "#DisplayCard", label: "dimensionHeight", widgetProps: {icon: "#IconRuler", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "dimensionUnit"}, field: {name: "dimensionUnit", widget: "#DisplayCard", label: "dimensionUnit", widgetProps: {icon: "#IconRuler", languageKeyCategory: "dimensionUnits", type: "enum"}}},
                        {render: "#DisplayCard", permissions: {read: "volumetricWeight"}, field: {name: "volumetricWeight", widget: "#DisplayCard", label: "volumetricWeight", widgetProps: {icon: "#IconWeight", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "shippingClass"}, field: {name: "shippingClass", widget: "#DisplayCard", label: "shippingClass", widgetProps: {icon: "#IconTruckDelivery"}}},
                        {render: "#DisplayCard", permissions: {read: "isHazmat"}, field: {name: "isHazmat", widget: "#DisplayCard", label: "isHazmat", widgetProps: {icon: "#IconAlertTriangle", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "requiresShipping"}, field: {name: "requiresShipping", widget: "#DisplayCard", label: "requiresShipping", widgetProps: {icon: "#IconTruckDelivery", valueType: "boolean", type: "boolean"}}},
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                        {render: "#DisplayCard", permissions: {read: "hasVariants"}, field: {name: "hasVariants", widget: "#DisplayCard", label: "hasVariants", widgetProps: {icon: "#IconToggleRight", valueType: "boolean"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "defaultVariant"},
                            field: {
                                name: "defaultVariant",
                                widget: "#DisplayCard",
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                            render: "#DisplayCard",
                            permissions: {read: "videoUrls"},
                            field: {
                                name: "videoUrls",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            permissions: {read: "highlights"},
                            field: {
                                name: "highlights",
                                widget: "#DisplayCard",
                                label: "highlights",
                                widgetProps: {icon: "#IconList", valueType: "stringBadgeList"},
                            },
                        },
                        {render: "#DisplayCard", permissions: {read: "careInstructions"}, field: {name: "careInstructions", widget: "#DisplayCard", label: "careInstructions", widgetProps: {icon: "#IconInfoCircle", expandable: true, maxLength: 250}}},
                        {render: "#DisplayCard", permissions: {read: "warranty"}, field: {name: "warranty", widget: "#DisplayCard", label: "warranty", widgetProps: {icon: "#IconShieldCheck", expandable: true, maxLength: 250}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "badges"},
                            field: {
                                name: "badges",
                                widget: "#DisplayCard",
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.metaTitle", widget: "#DisplayCard", label: "seoMetaTitle", widgetProps: {icon: "#IconSeo"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.canonicalUrl", widget: "#DisplayCard", label: "seoCanonicalUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.openGraphTitle", widget: "#DisplayCard", label: "seoOpenGraphTitle", widgetProps: {icon: "#IconShare"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.structuredDataType", widget: "#DisplayCard", label: "seoStructuredDataType", widgetProps: {icon: "#IconCode"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.twitterCard", widget: "#DisplayCard", label: "seoTwitterCard", widgetProps: {icon: "#IconBrandX", languageKeyCategory: "twitterCard", type: "enum"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.sitemapPriority", widget: "#DisplayCard", label: "seoSitemapPriority", widgetProps: {icon: "#Hash", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.sitemapInclude", widget: "#DisplayCard", label: "seoSitemapInclude", widgetProps: {icon: "#IconToggleRight", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.noIndex", widget: "#DisplayCard", label: "seoNoIndex", widgetProps: {icon: "#IconEyeOff", valueType: "boolean", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.metaDescription", widget: "#DisplayCard", label: "seoMetaDescription", widgetProps: {icon: "#IconAlignLeft"}}},
                        {render: "#DisplayCard", permissions: {read: "seo"}, field: {name: "seo.openGraphDescription", widget: "#DisplayCard", label: "seoOpenGraphDescription", widgetProps: {icon: "#IconAlignLeft"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "seo.metaKeywords"},
                            field: {
                                name: "seo.metaKeywords",
                                widget: "#DisplayCard",
                                label: "seoMetaKeywords",
                                widgetProps: {icon: "#IconTags", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        runtimeChildSheetGroup(
            "productVariants",
            "variants",
            "product.sheet.variants.listDisplay",
            "#ProductVariantCard",
            "entity",
            {
                icon: "#IconBarcode",
                label: "productVariant",
                valuePath: ["sku", "status"],
                joinSeparator: " · ",
                linkedSheetModel: "productVariants",
                linkedSheetWidget: "#ProductVariantSheetView",
                linkedSheetEntityProp: "entity",
            },
        ),
        runtimeChildSheetGroup(
            "inventories",
            "inventories",
            "product.sheet.inventories.listDisplay",
            "#InventoryCard",
            "inventory",
            {
                icon: "#IconBuildingWarehouse",
                label: "inventoryRow",
                valuePath: ["warehouse.name", "quantityOnHand"],
                joinSeparator: " · ",
                linkedSheetModel: "inventories",
                linkedSheetWidget: "#InventorySheetView",
                linkedSheetEntityProp: "inventory",
            },
        ),
        runtimeChildSheetGroup(
            "reviews",
            "reviews",
            "product.sheet.reviews.listDisplay",
            "#ProductReviewCard",
            "review",
            {
                icon: "#IconStar",
                label: "productReview",
                valuePath: ["rating", "title"],
                joinSeparator: " · ",
                linkedSheetModel: "productReviews",
                linkedSheetWidget: "#ProductReviewSheetView",
                linkedSheetEntityProp: "review",
            },
        ),
        lifecycleSheetGroup,
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
    nodes: productEditFormNodes,
};

export const productViews: ViewConfig[] = [productSheetView, productCreateFormView, productEditFormView];
