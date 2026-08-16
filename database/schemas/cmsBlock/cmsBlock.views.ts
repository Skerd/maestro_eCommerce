import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const cmsBlockTypeOptions = [
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
];

const visibilityDeviceOptions = [
    {value: "desktop", label: "form.visibilityDevice.desktop"},
    {value: "mobile", label: "form.visibilityDevice.mobile"},
    {value: "tablet", label: "form.visibilityDevice.tablet"},
];

const largeTextClassName = "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto font-mono text-xs";

/** Shared create/edit fields — isActive is menu-managed (activate/deactivate). */
const cmsBlockFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "title", widget: "#Input", label: "form.titleLabel", required: true}},
                    {
                        render: "#Field",
                        field: {
                            name: "type",
                            widget: "#Select",
                            label: "form.typeLabel",
                            required: true,
                            widgetProps: {options: cmsBlockTypeOptions, className: "grow w-full"},
                        },
                    },
                    {render: "#Field", field: {name: "position", widget: "#Input", label: "form.positionLabel", widgetProps: {type: "number", min: 0}}},
                    {render: "#Field", field: {name: "abTestVariant", widget: "#Input", label: "form.abTestVariantLabel"}},
                    {
                        render: "#Field",
                        field: {
                            name: "startsAt",
                            widget: "#DateInput",
                            label: "form.startsAtLabel",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "endsAt",
                            widget: "#DateInput",
                            label: "form.endsAtLabel",
                            widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.configSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#Field",
                field: {
                    name: "config",
                    widget: "#Textarea",
                    label: "form.configLabel",
                    placeholder: "form.configPlaceholder",
                    widgetProps: {rows: 8, className: largeTextClassName},
                },
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
                        render: "#Field",
                        field: {
                            name: "visibility.devices",
                            widget: "#Select",
                            label: "form.visibilityDevicesLabel",
                            widgetProps: {options: visibilityDeviceOptions, className: "grow w-full", multiple: true},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "visibility.regions",
                            widget: "#StringArrayField",
                            label: "form.visibilityRegionsLabel",
                            placeholder: "form.visibilityRegionsPlaceholder",
                            widgetProps: {removeTooltipKey: "form.removeRegion"},
                        },
                    },
                ],
            },
        ],
    },
];

export const cmsBlockSheetView: ViewConfig = {
    model: "cmsBlocks",
    viewType: "sheet",
    accessModel: "cmsBlocks",
    apiUrl: "/api/eCommerce/cmsBlock",
    header: {titleField: "title", subtitleKey: "cmsBlockSubtitle", showCloseButton: true},
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
                            field: {name: "title", widget: "#DisplayCard", label: "title", widgetProps: {icon: "#IconTag"}},
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
                            field: {name: "position", widget: "#DisplayCard", label: "position", widgetProps: {icon: "#Hash", type: "number"}},
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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "abTestVariant"},
                            field: {
                                name: "abTestVariant",
                                widget: "#DisplayCard",
                                label: "abTestVariant",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "config", defaultOpen: true},
            dependent: "configText",
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            field: {
                                name: "configText",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm whitespace-pre-wrap font-mono"},
                            },
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
                    render: "div",
                    props: {className: "space-y-3 p-1"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "visibility"},
                            field: {
                                name: "visibility.devices",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                        {
                            render: "#ExpandableText",
                            permissions: {read: "visibility"},
                            field: {
                                name: "visibility.regions",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "related", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "company"},
                            field: {
                                name: "company",
                                widget: "#DisplayCard",
                                label: "company",
                                widgetProps: {
                                    icon: "#IconBuilding",
                                    parent: "company",
                                    valuePath: ["name"],
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

export const cmsBlockCreateFormView: ViewConfig = {
    model: "cmsBlocks",
    viewType: "form",
    viewMode: "create",
    accessModel: "cmsBlocks",
    apiUrl: "/api/eCommerce/cmsBlock",
    method: "PUT",
    nodes: cmsBlockFormFields,
};

export const cmsBlockEditFormView: ViewConfig = {
    model: "cmsBlocks",
    viewType: "form",
    viewMode: "edit",
    accessModel: "cmsBlocks",
    apiUrl: "/api/eCommerce/cmsBlock",
    method: "PATCH",
    nodes: cmsBlockFormFields,
};

export const cmsBlockViews: ViewConfig[] = [cmsBlockSheetView, cmsBlockCreateFormView, cmsBlockEditFormView];
