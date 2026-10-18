import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const listingSheetView: ViewConfig = {
    model: "listings",
    viewType: "sheet",
    accessModel: "listings",
    apiUrl: "/api/eCommerceMarketplace/listing",
    header: {
        titleField: "title",
        subtitleKey: "listingSubtitle",
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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "title"},
                            field: {
                                name: "title",
                                widget: "#DisplayCard",
                                label: "title",
                                widgetProps: {icon: "#IconLabel"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "listingStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "category"},
                            field: {
                                name: "category",
                                widget: "#DisplayCard",
                                label: "category",
                                widgetProps: {
                                    icon: "#Folder",
                                    valuePath: ["category.name"],
                                    linkedRefPath: "category",
                                    linkedSheetModel: "listingCategories",
                                    linkedSheetWidget: "#CategorySheetView",
                                    linkedSheetEntityProp: "category",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "provider"},
                            field: {
                                name: "provider",
                                widget: "#DisplayCard",
                                label: "provider",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["provider.name", "provider.surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "price"},
                            field: {
                                name: "price",
                                widget: "#DisplayCard",
                                label: "price",
                                widgetProps: {
                                    icon: "#DollarSign",
                                    format: "locale",
                                    valuePath: ["priceCurrency.symbol", "price"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: { read: "priceCurrency" },
                            field: {
                                name: "priceCurrency",
                                widget: "#DisplayCard",
                                label: "priceCurrency",
                                widgetProps: {
                                    icon: "#DollarSign",
                                    format: "locale",
                                    valuePath: ["priceCurrency.symbol", "priceCurrency.name"],
                                    joinSeparator: " ",
                                    linkedRefPath: "priceCurrency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "priceCurrency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "pricingType"},
                            field: {
                                name: "pricingType",
                                widget: "#DisplayCard",
                                label: "pricingType",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "listingPricingType", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "deliveryDays"},
                            field: {
                                name: "deliveryDays",
                                widget: "#DisplayCard",
                                label: "deliveryDays",
                                widgetProps: {icon: "#Clock", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "address"},
            children: [
                {
                    render: "div",
                    props: {className: "space-y-2 mb-2"},
                    children: [
                        {
                            render: "#SheetGrid",
                            props: {columns: 3},
                            children: [
                                {
                                    render: "#DisplayCard",
                                    permissions: {read: "address"},
                                    field: {
                                        name: "address.country.name",
                                        widget: "#DisplayCard",
                                        label: "country",
                                        widgetProps: {
                                            icon: "#Globe",
                                            flagCodePath: "address.country.code",
                                            linkedRefPath: "address.country",
                                            linkedSheetModel: "countries",
                                            linkedSheetWidget: "#CountrySheetView",
                                            linkedSheetEntityProp: "country",
                                        },
                                    },
                                },
                                {
                                    render: "#DisplayCard",
                                    permissions: {read: "address"},
                                    field: {
                                        name: "address.state.name",
                                        widget: "#DisplayCard",
                                        label: "state",
                                        widgetProps: {
                                            icon: "#MapPin",
                                            linkedRefPath: "address.state",
                                            linkedSheetModel: "states",
                                            linkedSheetWidget: "#StateSheetView",
                                            linkedSheetEntityProp: "state",
                                        },
                                    },
                                },
                                {
                                    render: "#DisplayCard",
                                    permissions: {read: "address"},
                                    field: {
                                        name: "address.city.name",
                                        widget: "#DisplayCard",
                                        label: "city",
                                        widgetProps: {
                                            icon: "#Building",
                                            linkedRefPath: "address.city",
                                            linkedSheetModel: "cities",
                                            linkedSheetWidget: "#CitySheetView",
                                            linkedSheetEntityProp: "city",
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
            props: {title: "description"},
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "description"},
                            field: {
                                name: "description",
                                widget: "#ExpandableText",
                                label: "description",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "tags"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "tags"},
                            field: {
                                name: "tags",
                                widget: "#DisplayCard",
                                label: "tags",
                                widgetProps: {icon: "#Tag", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "requirements"},
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "requirements"},
                            field: {
                                name: "requirements",
                                widget: "#ExpandableText",
                                label: "requirements",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {storageKey: "listing.sheet.faqs", defaultMode: "cards"},
            children: [
                {
                    render: "#SheetGroup",
                    dependent: "faqs",
                    permissions: {read: "faqs"},
                    props: {title: "faqs", titleActions: "#ReferencesViewModeToggle"},
                    children: [
                        {
                            render: "div",
                            props: {className: "space-y-2"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "faqs"},
                                    field: {
                                        name: "faqs",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            fields: [
                                                {name: "question", type: "expandableText", className: "text-base font-medium ms-1"},
                                                {name: "answer", type: "expandableText", className: "text-sm"},
                                            ],
                                            compactSummaryField: "question",
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
                storageKey: "listing.sheet.promotions.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "promotions",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    permissions: {read: "promotions"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "promotions"},
                                    field: {
                                        name: "promotions",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#PromotionCard",
                                            pageSize: 2,
                                            compactRow: {
                                                icon: "#Tag",
                                                label: "promotion",
                                                valuePath: ["name", "type"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "promotions",
                                                linkedSheetWidget: "#PromotionSheetView",
                                                linkedSheetEntityProp: "promotion",
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
                storageKey: "listing.sheet.listingPackages.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "listingPackages",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    dependent: "listingPackages",
                    permissions: {read: "listingPackages"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "listingPackages"},
                                    field: {
                                        name: "listingPackages",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#ListingPackageCard",
                                            itemDataProp: "listingPackage",
                                            pageSize: 2,
                                            compactRow: {
                                                icon: "#Package",
                                                label: "listingPackage",
                                                valuePath: ["name", "order"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "listingPackages",
                                                linkedSheetWidget: "#ListingPackageSheetView",
                                                linkedSheetEntityProp: "listingPackage",
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
                storageKey: "listing.sheet.listingAddOns.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "listingAddOns",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    dependent: "listingAddOns",
                    permissions: {read: "listingAddOns"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "listingAddOns"},
                                    field: {
                                        name: "listingAddOns",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#ListingAddOnCard",
                                            itemDataProp: "listingAddOn",
                                            pageSize: 2,
                                            compactRow: {
                                                icon: "#Package",
                                                label: "listingAddOn",
                                                valuePath: ["name"],
                                                linkedSheetModel: "listingAddOns",
                                                linkedSheetWidget: "#ListingAddOnSheetView",
                                                linkedSheetEntityProp: "listingAddOn",
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
            props: {title: "gallery"},
            permissions: {read: "mainImage"},
            children: [
                {
                    render: "div",
                    props: {className: "max-w-full"},
                    children: [
                        {
                            render: "#GalleryCarousel",
                            permissions: {read: "mainImage"},
                            field: {
                                name: "mainImage",
                                widget: "#GalleryCarousel",
                                widgetProps: {
                                    imageGalleryField: "imageGallery",
                                    videoGalleryField: "videoGallery",
                                    showThumbnails: false,
                                    allowFullScreen: false,
                                    coverAfterFirst: false,
                                    showPreviews: true,
                                    previewLocation: "right",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const listingFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.general"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "title",
                            widget: "#Input",
                            label: "form.titleLabel",
                            placeholder: "form.titlePlaceholder",
                            required: true,
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "category",
                            widget: "#ApiSelect",
                            label: "form.categoryLabel",
                            placeholder: "form.categoryPlaceholder",
                            widgetProps: {apiUrl: "/api/eCommerceMarketplace/listingCategory/select"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "deliveryDays",
                            widget: "#Input",
                            label: "form.deliveryDaysLabel",
                            placeholder: "form.deliveryDaysPlaceholder",
                            widgetProps: {type: "number", min: 0, step: "any"},
                        },
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "price",
                            widget: "#Input",
                            label: "form.priceLabel",
                            widgetProps: {type: "number"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "priceCurrency",
                            widget: "#ApiSelect",
                            label: "form.priceCurrencyLabel",
                            placeholder: "form.priceCurrencyPlaceholder",
                            skipWriteAccessGate: true,
                            widgetProps: {apiUrl: "/api/finance/currency/select"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "pricingType",
                            widget: "#SimpleSelect",
                            label: "form.pricingTypeLabel",
                            placeholder: "form.pricingTypePlaceholder",
                            widgetProps: {
                                options: [
                                    {value: "fixed", label: "form.pricingType.fixed"},
                                    {value: "hourly", label: "form.pricingType.hourly"},
                                ],
                                className: "grow w-full",
                            },
                        },
                    },
                ],
            },
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    widgetProps: {className: "resize-none max-h-[250px] overflow-y-auto"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "tags",
                    widget: "#StringArrayInput",
                    label: "form.tagsLabel",
                    placeholder: "form.tagsPlaceholder",
                    widgetProps: {
                        removeTooltipKey: "form.tagsRemoveTooltip",
                        maxItems: 50,
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "requirements",
                    widget: "#StringArrayInput",
                    label: "form.requirementsLabel",
                    placeholder: "form.requirementsPlaceholder",
                    widgetProps: {
                        removeTooltipKey: "form.requirementsRemoveTooltip",
                        maxItems: 50,
                    },
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.location"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "address.country",
                            widget: "#ApiSelect",
                            label: "form.addressCountryLabel",
                            placeholder: "form.addressCountryPlaceholder",
                            widgetProps: {
                                apiUrl: "/api/auxiliary/country/select",
                                method: "POST",
                                pageSize: 50,
                                cascadeClearFormFields: ["address.state", "address.city"],
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "address.state",
                            widget: "#ApiSelect",
                            label: "form.addressStateLabel",
                            placeholder: "form.addressStatePlaceholder",
                            widgetProps: {
                                apiUrl: "/api/auxiliary/state/select",
                                method: "POST",
                                pageSize: 50,
                                postBodyFromFormFields: [{field: "address.country", paramName: "country"}],
                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                cascadeClearFormFields: ["address.city"],
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "address.city",
                            widget: "#ApiSelect",
                            label: "form.addressCityLabel",
                            placeholder: "form.addressCityPlaceholder",
                            widgetProps: {
                                apiUrl: "/api/auxiliary/city/select",
                                method: "POST",
                                pageSize: 50,
                                postBodyFromFormFields: [
                                    {field: "address.country", paramName: "country"},
                                    {field: "address.state", paramName: "state"},
                                ],
                                enableWhenFormFieldsNonEmpty: ["address.country"],
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#Field",
        permissions: {write: "faqs"},
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
                            {
                                render: "#Field",
                                field: {
                                    name: "question",
                                    widget: "#Input",
                                    label: "form.faqQuestionLabel",
                                    placeholder: "form.faqQuestionPlaceholder",
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "answer",
                                    widget: "#Textarea",
                                    label: "form.faqAnswerLabel",
                                    placeholder: "form.faqAnswerPlaceholder",
                                    widgetProps: {className: "resize-none max-h-[250px] overflow-y-auto"},
                                },
                            },
                        ],
                    },
                ],
            },
        },
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.images"},
        permissions: {write: "mainImage"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
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
                    {
                        render: "#Field",
                        field: {
                            name: "imageGallery",
                            widget: "#MediaField",
                            label: "form.imageGalleryLabel",
                            widgetProps: {mediaType: "image", mode: "multiple", maxCount: 8},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.video"},
        permissions: {write: "videoGallery"},
        children: [
            {
                render: "#Field",
                field: {
                    name: "videoGallery",
                    widget: "#MediaField",
                    label: "form.videoGalleryLabel",
                    widgetProps: {mediaType: "video", mode: "multiple", maxCount: 3},
                },
            },
        ],
    },
];

export const listingCreateFormView: ViewConfig = {
    model: "listings",
    viewType: "form",
    viewMode: "create",
    accessModel: "listings",
    apiUrl: "/api/eCommerceMarketplace/listing",
    method: "PUT",
    nodes: listingFormFields,
};

export const listingEditFormView: ViewConfig = {
    model: "listings",
    viewType: "form",
    viewMode: "edit",
    accessModel: "listings",
    apiUrl: "/api/eCommerceMarketplace/listing",
    method: "PATCH",
    nodes: listingFormFields,
};

export const listingViews: ViewConfig[] = [listingSheetView, listingCreateFormView, listingEditFormView];
