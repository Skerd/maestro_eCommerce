import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {
    CMS_BLOCK_CONFIG_LIMIT_MAX,
    CMS_BLOCK_CONFIG_LIMIT_MIN,
    CMS_BLOCK_CTA_LABEL_MAX,
    CMS_BLOCK_HEADLINE_MAX,
    CMS_BLOCK_HTML_MAX,
    CMS_BLOCK_MESSAGE_MAX,
    CMS_BLOCK_REGION_MAX,
    CMS_BLOCK_SUBHEADLINE_MAX,
    CMS_BLOCK_TITLE_MAX,
    CMS_BLOCK_URL_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.schema-def";

export const cmsBlockSheetView: ViewConfig = {
    model: "cmsBlocks",
    viewType: "sheet",
    accessModel: "cmsBlocks",
    apiUrl: "/api/eCommerce/cmsBlock",
    header: {
        titleField: "title",
        subtitleKey: "cmsBlockSubtitle",
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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "title"},
                            field: {
                                name: "title",
                                widget: "#DisplayCard",
                                label: "title",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "type"},
                            field: {
                                name: "type",
                                widget: "#DisplayCard",
                                label: "type",
                                widgetProps: {icon: "#IconLayout", languageKeyCategory: "cmsBlockType", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#DisplayCard",
                                label: "isActive",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "position"},
                            field: {
                                name: "position",
                                widget: "#DisplayCard",
                                label: "position",
                                widgetProps: {icon: "#Hash", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "startsAt"},
                            field: {
                                name: "startsAt",
                                widget: "#DisplayCard",
                                label: "startsAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "endsAt"},
                            field: {
                                name: "endsAt",
                                widget: "#DisplayCard",
                                label: "endsAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "config", defaultOpen: true},
            dependentAny: [
                "config.headline",
                "config.subheadline",
                "config.imageUrl",
                "config.ctaLabel",
                "config.ctaHref",
                "config.message",
                "config.linkHref",
                "config.html",
                "config.url",
                "config.collectionId",
                "config.categoryIds",
                "config.limit",
            ],
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "config.headline",
                            permissions: {read: "config.headline"},
                            field: {
                                name: "config.headline",
                                widget: "#DisplayCard",
                                label: "headline",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.subheadline",
                            permissions: {read: "config.subheadline"},
                            field: {
                                name: "config.subheadline",
                                widget: "#DisplayCard",
                                label: "subheadline",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.imageUrl",
                            permissions: {read: "config.imageUrl"},
                            field: {
                                name: "config.imageUrl",
                                widget: "#DisplayCard",
                                label: "imageUrl",
                                widgetProps: {icon: "#IconPhoto"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.ctaLabel",
                            permissions: {read: "config.ctaLabel"},
                            field: {
                                name: "config.ctaLabel",
                                widget: "#DisplayCard",
                                label: "ctaLabel",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.ctaHref",
                            permissions: {read: "config.ctaHref"},
                            field: {
                                name: "config.ctaHref",
                                widget: "#DisplayCard",
                                label: "ctaHref",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.message",
                            permissions: {read: "config.message"},
                            field: {
                                name: "config.message",
                                widget: "#DisplayCard",
                                label: "message",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.linkHref",
                            permissions: {read: "config.linkHref"},
                            field: {
                                name: "config.linkHref",
                                widget: "#DisplayCard",
                                label: "linkHref",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.url",
                            permissions: {read: "config.url"},
                            field: {
                                name: "config.url",
                                widget: "#DisplayCard",
                                label: "url",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.limit",
                            permissions: {read: "config.limit"},
                            field: {
                                name: "config.limit",
                                widget: "#DisplayCard",
                                label: "limit",
                                widgetProps: {icon: "#Hash", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "config.collectionId",
                            permissions: {read: "config.collectionId"},
                            field: {
                                name: "config.collectionId",
                                widget: "#DisplayCard",
                                label: "collection",
                                widgetProps: {icon: "#IconLayout", parent: "config.collectionId", valuePath: ["name"]},
                            },
                        },
                    ],
                },
                {
                    render: "div",
                    dependent: "config.html",
                    permissions: {read: "config.html"},
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "config.html"},
                            field: {
                                name: "config.html",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm whitespace-pre-wrap font-mono"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "cmsBlock.sheet.slides.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    dependent: "config.slides",
                    permissions: {read: "config.slides"},
                    props: {
                        title: "slides",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    dependent: "config.slides",
                                    permissions: {read: "config.slides"},
                                    field: {
                                        name: "config.slides",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            cardColumns: 2,
                                            compactSummaryFields: ["headline", "imageUrl"],
                                            fields: [
                                                {name: "headline", type: "text", icon: "#IconTag", labelKey: "headline"},
                                                {name: "subheadline", type: "text", icon: "#IconAlignLeft", labelKey: "subheadline"},
                                                {name: "imageUrl", type: "text", icon: "#IconPhoto", labelKey: "imageUrl"},
                                                {name: "ctaLabel", type: "text", icon: "#IconPointer", labelKey: "ctaLabel"},
                                                {name: "ctaHref", type: "url", icon: "#IconLink", labelKey: "ctaHref"},
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
                storageKey: "cmsBlock.sheet.items.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    dependent: "config.items",
                    permissions: {read: "config.items"},
                    props: {
                        title: "items",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    dependent: "config.items",
                                    permissions: {read: "config.items"},
                                    field: {
                                        name: "config.items",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            cardColumns: 2,
                                            compactSummaryFields: ["title", "imageUrl"],
                                            fields: [
                                                {name: "title", type: "text", icon: "#IconTag", labelKey: "itemTitle"},
                                                {name: "imageUrl", type: "text", icon: "#IconPhoto", labelKey: "imageUrl"},
                                                {name: "href", type: "url", icon: "#IconLink", labelKey: "itemHref"},
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
                storageKey: "cmsBlock.sheet.categories.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    dependent: "config.categoryIds",
                    permissions: {read: "config.categoryIds"},
                    props: {
                        title: "categories",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    dependent: "config.categoryIds",
                                    permissions: {read: "config.categoryIds"},
                                    field: {
                                        name: "config.categoryIds",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            cardColumns: 2,
                                            compactSummaryFields: ["name"],
                                            fields: [
                                                {name: "name", type: "text", icon: "#IconLayout", labelKey: "categoryName"},
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
            render: "#SheetGroup",
            props: {title: "visibility", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "visibility.devices"},
                            field: {
                                name: "visibility.devices",
                                widget: "#DisplayCard",
                                label: "devices",
                                widgetProps: {icon: "#IconDevices", valueType: "stringBadgeList", languageKeyCategory: "visibilityDevice"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "visibility.regions"},
                            field: {
                                name: "visibility.regions",
                                widget: "#DisplayCard",
                                label: "regions",
                                widgetProps: {icon: "#IconMapPin", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const cmsBlockCreateHeadlineLimitFields: ViewConfig["nodes"] = [
    {
        render: "#Field",
        field: {
            name: "config.headline",
            widget: "#Input",
            label: "form.headlineLabel",
            placeholder: "form.headlinePlaceholder",
            widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
        },
    },
    {
        render: "#Field",
        field: {
            name: "config.subheadline",
            widget: "#Input",
            label: "form.subheadlineLabel",
            placeholder: "form.subheadlinePlaceholder",
            widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
        },
    },
    {
        render: "#Field",
        field: {
            name: "config.limit",
            widget: "#Input",
            label: "form.limitLabel",
            placeholder: "form.limitPlaceholder",
            widgetProps: {type: "number", min: CMS_BLOCK_CONFIG_LIMIT_MIN, max: CMS_BLOCK_CONFIG_LIMIT_MAX},
        },
    },
];

const cmsBlockCreateFormNodes: ViewConfig["nodes"] = [
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
                            name: "title",
                            widget: "#Input",
                            label: "form.titleLabel",
                            placeholder: "form.titlePlaceholder",
                            required: true,
                            widgetProps: {maxLength: CMS_BLOCK_TITLE_MAX},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            placeholder: "form.typePlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "hero_banner", label: "form.cmsBlockType.hero_banner"},
                                    {value: "slider", label: "form.cmsBlockType.slider"},
                                    {value: "featured_collection", label: "form.cmsBlockType.featured_collection"},
                                    {value: "trending", label: "form.cmsBlockType.trending"},
                                    {value: "best_sellers", label: "form.cmsBlockType.best_sellers"},
                                    {value: "flash_sale", label: "form.cmsBlockType.flash_sale"},
                                    {value: "announcement_bar", label: "form.cmsBlockType.announcement_bar"},
                                    {value: "custom_html", label: "form.cmsBlockType.custom_html"},
                                    {value: "video", label: "form.cmsBlockType.video"},
                                    {value: "grid", label: "form.cmsBlockType.grid"},
                                    {value: "category_showcase", label: "form.cmsBlockType.category_showcase"},
                                    {value: "promotional_section", label: "form.cmsBlockType.promotional_section"},
                                ],
                                className: "grow w-full"
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            placeholder: "form.startsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "endsAt",
                            widget: "#DateInput",
                            label: "form.endsAtLabel",
                            placeholder: "form.endsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                ]
            }
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.configSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["hero_banner", "promotional_section"],
                    clearFields: ["config.headline", "config.subheadline", "config.imageUrl", "config.ctaLabel", "config.ctaHref"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.headline",
                                    widget: "#Input",
                                    label: "form.headlineLabel",
                                    placeholder: "form.headlinePlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.subheadline",
                                    widget: "#Input",
                                    label: "form.subheadlineLabel",
                                    placeholder: "form.subheadlinePlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.imageUrl",
                                    widget: "#Input",
                                    label: "form.imageUrlLabel",
                                    placeholder: "form.imageUrlPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.ctaLabel",
                                    widget: "#Input",
                                    label: "form.ctaLabelLabel",
                                    placeholder: "form.ctaLabelPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_CTA_LABEL_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.ctaHref",
                                    widget: "#Input",
                                    label: "form.ctaHrefLabel",
                                    placeholder: "form.ctaHrefPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["slider"],
                    clearFields: ["config.slides"],
                    setFieldsOnMatch: {["config.slides"]: [{headline: "", subheadline: "", imageUrl: "", ctaLabel: "", ctaHref: ""}]},
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.slides",
                            widget: "#FormRepeater",
                            widgetProps: {
                                title: "form.slidesLabel",
                                arrayField: "config.slides",
                                defaultItem: {headline: "", subheadline: "", imageUrl: "", ctaLabel: "", ctaHref: ""},
                                addLabel: "form.slideAddRow",
                                removeLabel: "form.slideRemoveRow",
                                rowTitleFields: ["headline"],
                                rowTitlePlaceholder: "form.slideRowTitle",
                                rowTemplate: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "headline",
                                            widget: "#Input",
                                            label: "form.headlineLabel",
                                            placeholder: "form.headlinePlaceholder",
                                            required: true,
                                            widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "subheadline",
                                            widget: "#Input",
                                            label: "form.subheadlineLabel",
                                            placeholder: "form.subheadlinePlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "imageUrl",
                                            widget: "#Input",
                                            label: "form.imageUrlLabel",
                                            placeholder: "form.imageUrlPlaceholder",
                                            required: true,
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "ctaLabel",
                                            widget: "#Input",
                                            label: "form.ctaLabelLabel",
                                            placeholder: "form.ctaLabelPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_CTA_LABEL_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "ctaHref",
                                            widget: "#Input",
                                            label: "form.ctaHrefLabel",
                                            placeholder: "form.ctaHrefPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["announcement_bar"],
                    clearFields: ["config.message", "config.linkHref"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.message",
                                    widget: "#Input",
                                    label: "form.messageLabel",
                                    placeholder: "form.messagePlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: CMS_BLOCK_MESSAGE_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.linkHref",
                                    widget: "#Input",
                                    label: "form.linkHrefLabel",
                                    placeholder: "form.linkHrefPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["custom_html"],
                    clearFields: ["config.html"],
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.html",
                            widget: "#Textarea",
                            label: "form.htmlLabel",
                            placeholder: "form.htmlPlaceholder",
                            required: true,
                            widgetProps: {
                                rows: 8,
                                maxLength: CMS_BLOCK_HTML_MAX,
                                className: "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto font-mono text-xs",
                            },
                        },
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["video"],
                    clearFields: ["config.url"],
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.url",
                            widget: "#Input",
                            label: "form.urlLabel",
                            placeholder: "form.urlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                        },
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["featured_collection", "flash_sale"],
                    clearFields: ["config.collectionId", "config.headline", "config.subheadline", "config.limit"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.collectionId",
                                    widget: "#ApiSelect",
                                    label: "form.collectionIdLabel",
                                    placeholder: "form.collectionIdPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/collection/select",
                                        method: "POST",
                                        pageSize: 50,
                                        normalizeEmptyToUndefined: true,
                                        className: "grow w-full",
                                    },
                                },
                            },
                            ...cmsBlockCreateHeadlineLimitFields,
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["category_showcase"],
                    clearFields: ["config.categoryIds", "config.headline", "config.subheadline", "config.limit"],
                    setFieldsOnMatch: {["config.categoryIds"]: []},
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.categoryIds",
                                    widget: "#ObjectIdChipsInput",
                                    label: "form.categoryIdsLabel",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/category/select",
                                        method: "POST",
                                        placeholderKey: "form.selectCategory",
                                        removeTooltipKey: "form.removeCategory",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "config.categoryIds",
                                    },
                                },
                            },
                            ...cmsBlockCreateHeadlineLimitFields,
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["trending", "best_sellers"],
                    clearFields: ["config.headline", "config.subheadline", "config.limit"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.headline",
                                    widget: "#Input",
                                    label: "form.headlineLabel",
                                    placeholder: "form.headlinePlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.subheadline",
                                    widget: "#Input",
                                    label: "form.subheadlineLabel",
                                    placeholder: "form.subheadlinePlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.limit",
                                    widget: "#Input",
                                    label: "form.limitLabel",
                                    placeholder: "form.limitPlaceholder",
                                    required: true,
                                    widgetProps: {type: "number", min: CMS_BLOCK_CONFIG_LIMIT_MIN, max: CMS_BLOCK_CONFIG_LIMIT_MAX},
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["grid"],
                    clearFields: ["config.items"],
                    setFieldsOnMatch: {["config.items"]: [{title: "", imageUrl: "", href: ""}]},
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.items",
                            widget: "#FormRepeater",
                            widgetProps: {
                                title: "form.itemsLabel",
                                arrayField: "config.items",
                                defaultItem: {title: "", imageUrl: "", href: ""},
                                addLabel: "form.itemAddRow",
                                removeLabel: "form.itemRemoveRow",
                                rowTitleFields: ["title"],
                                rowTitlePlaceholder: "form.itemRowTitle",
                                rowTemplate: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "title",
                                            widget: "#Input",
                                            label: "form.itemTitleLabel",
                                            placeholder: "form.itemTitlePlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_TITLE_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "imageUrl",
                                            widget: "#Input",
                                            label: "form.imageUrlLabel",
                                            placeholder: "form.imageUrlPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "href",
                                            widget: "#Input",
                                            label: "form.itemHrefLabel",
                                            placeholder: "form.itemHrefPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 1},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "visibility.devices",
                                    widget: "#Select",
                                    label: "form.visibilityDevicesLabel",
                                    placeholder: "form.visibilityDevicesPlaceholder",
                                    widgetProps: {
                                        options: [
                                            {value: "desktop", label: "form.visibilityDevice.desktop"},
                                            {value: "mobile", label: "form.visibilityDevice.mobile"},
                                            {value: "tablet", label: "form.visibilityDevice.tablet"},
                                        ],
                                        className: "grow w-full",
                                        multiple: true
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "visibility.regions",
                                    widget: "#StringArrayInput",
                                    label: "form.visibilityRegionsLabel",
                                    placeholder: "form.visibilityRegionsPlaceholder",
                                    widgetProps: {removeTooltipKey: "form.removeRegion", maxLength: CMS_BLOCK_REGION_MAX},
                                },
                            },
                        ],
                    },
                ]
            },
        ],
    },
];

const cmsBlockEditHeadlineLimitFields: ViewConfig["nodes"] = [
    {
        render: "#Field",
        field: {
            name: "config.headline",
            widget: "#Input",
            label: "form.headlineLabel",
            placeholder: "form.headlinePlaceholder",
            widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
        }, permissions: {read: "config.headline", write: "config.headline"},
    },
    {
        render: "#Field",
        field: {
            name: "config.subheadline",
            widget: "#Input",
            label: "form.subheadlineLabel",
            placeholder: "form.subheadlinePlaceholder",
            widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
        }, permissions: {read: "config.subheadline", write: "config.subheadline"},
    },
    {
        render: "#Field",
        field: {
            name: "config.limit",
            widget: "#Input",
            label: "form.limitLabel",
            placeholder: "form.limitPlaceholder",
            widgetProps: {type: "number", min: CMS_BLOCK_CONFIG_LIMIT_MIN, max: CMS_BLOCK_CONFIG_LIMIT_MAX},
        }, permissions: {read: "config.limit", write: "config.limit"},
    },
];

const cmsBlockEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["title", "type", "position", "startsAt", "endsAt"],
            writeAny: ["title", "type", "position", "startsAt", "endsAt"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "title",
                            widget: "#Input",
                            label: "form.titleLabel",
                            placeholder: "form.titlePlaceholder",
                            required: true,
                            widgetProps: {maxLength: CMS_BLOCK_TITLE_MAX},
                        }, permissions: {read: "title", write: "title"},
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            placeholder: "form.typePlaceholder",
                            required: true,
                            widgetProps: {
                                options: [
                                    {value: "hero_banner", label: "form.cmsBlockType.hero_banner"},
                                    {value: "slider", label: "form.cmsBlockType.slider"},
                                    {value: "featured_collection", label: "form.cmsBlockType.featured_collection"},
                                    {value: "trending", label: "form.cmsBlockType.trending"},
                                    {value: "best_sellers", label: "form.cmsBlockType.best_sellers"},
                                    {value: "flash_sale", label: "form.cmsBlockType.flash_sale"},
                                    {value: "announcement_bar", label: "form.cmsBlockType.announcement_bar"},
                                    {value: "custom_html", label: "form.cmsBlockType.custom_html"},
                                    {value: "video", label: "form.cmsBlockType.video"},
                                    {value: "grid", label: "form.cmsBlockType.grid"},
                                    {value: "category_showcase", label: "form.cmsBlockType.category_showcase"},
                                    {value: "promotional_section", label: "form.cmsBlockType.promotional_section"},
                                ],
                                className: "grow w-full"
                            },
                        }, permissions: {read: "type", write: "type"},
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "position",
                            widget: "#Input",
                            label: "form.positionLabel",
                            placeholder: "form.positionPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        }, permissions: {read: "position", write: "position"},
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            placeholder: "form.startsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        }, permissions: {read: "startsAt", write: "startsAt"},
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "endsAt",
                            widget: "#DateInput",
                            label: "form.endsAtLabel",
                            placeholder: "form.endsAtPlaceholder",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        }, permissions: {read: "endsAt", write: "endsAt"},
                    },
                ]
            }
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.configSectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["config.headline", "config.subheadline", "config.imageUrl", "config.ctaLabel", "config.ctaHref", "config.slides", "config.message", "config.linkHref", "config.html", "config.url", "config.collectionId", "config.limit", "config.categoryIds", "config.items"],
            writeAny: ["config.headline", "config.subheadline", "config.imageUrl", "config.ctaLabel", "config.ctaHref", "config.slides", "config.message", "config.linkHref", "config.html", "config.url", "config.collectionId", "config.limit", "config.categoryIds", "config.items"],
        },
        children: [
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["hero_banner", "promotional_section"],
                    clearFields: ["config.headline", "config.subheadline", "config.imageUrl", "config.ctaLabel", "config.ctaHref"],
                },
                permissions: {
                    readAny: ["config.headline", "config.subheadline", "config.imageUrl", "config.ctaLabel", "config.ctaHref"],
                    writeAny: ["config.headline", "config.subheadline", "config.imageUrl", "config.ctaLabel", "config.ctaHref"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.headline",
                                    widget: "#Input",
                                    label: "form.headlineLabel",
                                    placeholder: "form.headlinePlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
                                }, permissions: {read: "config.headline", write: "config.headline"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.subheadline",
                                    widget: "#Input",
                                    label: "form.subheadlineLabel",
                                    placeholder: "form.subheadlinePlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
                                }, permissions: {read: "config.subheadline", write: "config.subheadline"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.imageUrl",
                                    widget: "#Input",
                                    label: "form.imageUrlLabel",
                                    placeholder: "form.imageUrlPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                }, permissions: {read: "config.imageUrl", write: "config.imageUrl"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.ctaLabel",
                                    widget: "#Input",
                                    label: "form.ctaLabelLabel",
                                    placeholder: "form.ctaLabelPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_CTA_LABEL_MAX},
                                }, permissions: {read: "config.ctaLabel", write: "config.ctaLabel"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.ctaHref",
                                    widget: "#Input",
                                    label: "form.ctaHrefLabel",
                                    placeholder: "form.ctaHrefPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                }, permissions: {read: "config.ctaHref", write: "config.ctaHref"},
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["slider"],
                    clearFields: ["config.slides"],
                    setFieldsOnMatch: {["config.slides"]: [{headline: "", subheadline: "", imageUrl: "", ctaLabel: "", ctaHref: ""}]},
                },
                permissions: {
                    readAny: ["config.slides"],
                    writeAny: ["config.slides"],
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.slides",
                            widget: "#FormRepeater",
                            widgetProps: {
                                title: "form.slidesLabel",
                                arrayField: "config.slides",
                                defaultItem: {headline: "", subheadline: "", imageUrl: "", ctaLabel: "", ctaHref: ""},
                                addLabel: "form.slideAddRow",
                                removeLabel: "form.slideRemoveRow",
                                rowTitleFields: ["headline"],
                                rowTitlePlaceholder: "form.slideRowTitle",
                                rowTemplate: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "headline",
                                            widget: "#Input",
                                            label: "form.headlineLabel",
                                            placeholder: "form.headlinePlaceholder",
                                            required: true,
                                            widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "subheadline",
                                            widget: "#Input",
                                            label: "form.subheadlineLabel",
                                            placeholder: "form.subheadlinePlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "imageUrl",
                                            widget: "#Input",
                                            label: "form.imageUrlLabel",
                                            placeholder: "form.imageUrlPlaceholder",
                                            required: true,
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "ctaLabel",
                                            widget: "#Input",
                                            label: "form.ctaLabelLabel",
                                            placeholder: "form.ctaLabelPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_CTA_LABEL_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "ctaHref",
                                            widget: "#Input",
                                            label: "form.ctaHrefLabel",
                                            placeholder: "form.ctaHrefPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                ],
                            },
                        }, permissions: {readAny: ["config.slides"], writeAny: ["config.slides"]},
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["announcement_bar"],
                    clearFields: ["config.message", "config.linkHref"],
                },
                permissions: {
                    readAny: ["config.message", "config.linkHref"],
                    writeAny: ["config.message", "config.linkHref"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.message",
                                    widget: "#Input",
                                    label: "form.messageLabel",
                                    placeholder: "form.messagePlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: CMS_BLOCK_MESSAGE_MAX},
                                }, permissions: {read: "config.message", write: "config.message"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.linkHref",
                                    widget: "#Input",
                                    label: "form.linkHrefLabel",
                                    placeholder: "form.linkHrefPlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                }, permissions: {read: "config.linkHref", write: "config.linkHref"},
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["custom_html"],
                    clearFields: ["config.html"],
                },
                permissions: {
                    readAny: ["config.html"],
                    writeAny: ["config.html"],
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.html",
                            widget: "#Textarea",
                            label: "form.htmlLabel",
                            placeholder: "form.htmlPlaceholder",
                            required: true,
                            widgetProps: {
                                rows: 8,
                                maxLength: CMS_BLOCK_HTML_MAX,
                                className: "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto font-mono text-xs",
                            },
                        }, permissions: {read: "config.html", write: "config.html"},
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["video"],
                    clearFields: ["config.url"],
                },
                permissions: {
                    readAny: ["config.url"],
                    writeAny: ["config.url"],
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.url",
                            widget: "#Input",
                            label: "form.urlLabel",
                            placeholder: "form.urlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                        }, permissions: {read: "config.url", write: "config.url"},
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["featured_collection", "flash_sale"],
                    clearFields: ["config.collectionId", "config.headline", "config.subheadline", "config.limit"],
                },
                permissions: {
                    readAny: ["config.collectionId", "config.headline", "config.subheadline", "config.limit"],
                    writeAny: ["config.collectionId", "config.headline", "config.subheadline", "config.limit"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.collectionId",
                                    widget: "#ApiSelect",
                                    label: "form.collectionIdLabel",
                                    placeholder: "form.collectionIdPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/collection/select",
                                        method: "POST",
                                        pageSize: 50,
                                        normalizeEmptyToUndefined: true,
                                        className: "grow w-full",
                                    },
                                }, permissions: {read: "config.collectionId", write: "config.collectionId"},
                            },
                            ...cmsBlockEditHeadlineLimitFields,
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["category_showcase"],
                    clearFields: ["config.categoryIds", "config.headline", "config.subheadline", "config.limit"],
                    setFieldsOnMatch: {["config.categoryIds"]: []},
                },
                permissions: {
                    readAny: ["config.categoryIds", "config.headline", "config.subheadline", "config.limit"],
                    writeAny: ["config.categoryIds", "config.headline", "config.subheadline", "config.limit"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.categoryIds",
                                    widget: "#ObjectIdChipsInput",
                                    label: "form.categoryIdsLabel",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/eCommerce/category/select",
                                        method: "POST",
                                        placeholderKey: "form.selectCategory",
                                        removeTooltipKey: "form.removeCategory",
                                        selectPageSizeCreate: 50,
                                        selectPageSizeEdit: 200,
                                        labelRefFormExtraKey: "config.categoryIds",
                                    },
                                }, permissions: {read: "config.categoryIds", write: "config.categoryIds"},
                            },
                            ...cmsBlockEditHeadlineLimitFields,
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["trending", "best_sellers"],
                    clearFields: ["config.headline", "config.subheadline", "config.limit"],
                },
                permissions: {
                    readAny: ["config.headline", "config.subheadline", "config.limit"],
                    writeAny: ["config.headline", "config.subheadline", "config.limit"],
                },
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "config.headline",
                                    widget: "#Input",
                                    label: "form.headlineLabel",
                                    placeholder: "form.headlinePlaceholder",
                                    required: true,
                                    widgetProps: {maxLength: CMS_BLOCK_HEADLINE_MAX},
                                }, permissions: {read: "config.headline", write: "config.headline"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.subheadline",
                                    widget: "#Input",
                                    label: "form.subheadlineLabel",
                                    placeholder: "form.subheadlinePlaceholder",
                                    widgetProps: {maxLength: CMS_BLOCK_SUBHEADLINE_MAX},
                                }, permissions: {read: "config.subheadline", write: "config.subheadline"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "config.limit",
                                    widget: "#Input",
                                    label: "form.limitLabel",
                                    placeholder: "form.limitPlaceholder",
                                    required: true,
                                    widgetProps: {type: "number", min: CMS_BLOCK_CONFIG_LIMIT_MIN, max: CMS_BLOCK_CONFIG_LIMIT_MAX},
                                }, permissions: {read: "config.limit", write: "config.limit"},
                            },
                        ],
                    },
                ],
            },
            {
                render: "#FormWhenFieldValueIn",
                props: {
                    watchField: "type",
                    whenValues: ["grid"],
                    clearFields: ["config.items"],
                    setFieldsOnMatch: {["config.items"]: [{title: "", imageUrl: "", href: ""}]},
                },
                permissions: {
                    readAny: ["config.items"],
                    writeAny: ["config.items"],
                },
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "config.items",
                            widget: "#FormRepeater",
                            widgetProps: {
                                title: "form.itemsLabel",
                                arrayField: "config.items",
                                defaultItem: {title: "", imageUrl: "", href: ""},
                                addLabel: "form.itemAddRow",
                                removeLabel: "form.itemRemoveRow",
                                rowTitleFields: ["title"],
                                rowTitlePlaceholder: "form.itemRowTitle",
                                rowTemplate: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "title",
                                            widget: "#Input",
                                            label: "form.itemTitleLabel",
                                            placeholder: "form.itemTitlePlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_TITLE_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "imageUrl",
                                            widget: "#Input",
                                            label: "form.imageUrlLabel",
                                            placeholder: "form.imageUrlPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "href",
                                            widget: "#Input",
                                            label: "form.itemHrefLabel",
                                            placeholder: "form.itemHrefPlaceholder",
                                            widgetProps: {maxLength: CMS_BLOCK_URL_MAX},
                                        },
                                    },
                                ],
                            },
                        }, permissions: {readAny: ["config.items"], writeAny: ["config.items"]},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle", defaultOpen: true},
        permissions: {
            readAny: ["visibility.devices", "visibility.regions"],
            writeAny: ["visibility.devices", "visibility.regions"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 1},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "visibility.devices",
                                    widget: "#Select",
                                    label: "form.visibilityDevicesLabel",
                                    placeholder: "form.visibilityDevicesPlaceholder",
                                    widgetProps: {
                                        options: [
                                            {value: "desktop", label: "form.visibilityDevice.desktop"},
                                            {value: "mobile", label: "form.visibilityDevice.mobile"},
                                            {value: "tablet", label: "form.visibilityDevice.tablet"},
                                        ],
                                        className: "grow w-full",
                                        multiple: true
                                    },
                                }, permissions: {read: "visibility.devices", write: "visibility.devices"},
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "visibility.regions",
                                    widget: "#StringArrayInput",
                                    label: "form.visibilityRegionsLabel",
                                    placeholder: "form.visibilityRegionsPlaceholder",
                                    widgetProps: {removeTooltipKey: "form.removeRegion", maxLength: CMS_BLOCK_REGION_MAX},
                                }, permissions: {read: "visibility.regions", write: "visibility.regions"},
                            },
                        ],
                    },
                ]
            }
        ],
    },
];

export const cmsBlockCreateFormView: ViewConfig = {
    model: "cmsBlocks",
    viewType: "form",
    viewMode: "create",
    accessModel: "cmsBlocks",
    apiUrl: "/api/eCommerce/cmsBlock",
    method: "PUT",
    nodes: cmsBlockCreateFormNodes,
};

export const cmsBlockEditFormView: ViewConfig = {
    model: "cmsBlocks",
    viewType: "form",
    viewMode: "edit",
    accessModel: "cmsBlocks",
    apiUrl: "/api/eCommerce/cmsBlock",
    method: "PATCH",
    nodes: cmsBlockEditFormNodes,
};

export const cmsBlockViews: ViewConfig[] = [cmsBlockSheetView, cmsBlockCreateFormView, cmsBlockEditFormView];
