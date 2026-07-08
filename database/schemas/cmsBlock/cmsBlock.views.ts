import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

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

const cmsBlockFormFields: ViewConfig["nodes"] = [
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
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
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
            {render: "#Field", field: {name: "abTestVariant", widget: "#Input", label: "form.abTestVariantLabel"}},
        ],
    },
    {
        render: "#Field",
        field: {
            name: "config",
            widget: "#Textarea",
            label: "form.configLabel",
            placeholder: "form.configPlaceholder",
            widgetProps: {rows: 6},
        },
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle"},
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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconLayout", languageKeyCategory: "cmsBlockType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "position"}, field: {name: "position", widget: "#SmallInfoCard", label: "position", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "startsAt"}, field: {name: "startsAt", widget: "#SmallInfoCard", label: "startsAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "endsAt"}, field: {name: "endsAt", widget: "#SmallInfoCard", label: "endsAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "abTestVariant"}, field: {name: "abTestVariant", widget: "#SmallInfoCard", label: "abTestVariant", widgetProps: {icon: "#IconFlask"}}},
                    ],
                },
            ],
        },
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
