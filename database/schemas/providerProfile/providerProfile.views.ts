import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const weekdayOptions = [
    {value: "0", label: "weekday.0"},
    {value: "1", label: "weekday.1"},
    {value: "2", label: "weekday.2"},
    {value: "3", label: "weekday.3"},
    {value: "4", label: "weekday.4"},
    {value: "5", label: "weekday.5"},
    {value: "6", label: "weekday.6"},
];

export const providerProfileSheetView: ViewConfig = {
    model: "providerprofiles",
    viewType: "sheet",
    accessModel: "providerprofiles",
    apiUrl: "/api/eCommerceMarketplace/providerProfile",
    header: {
        titleField: "user.fullName",
        subtitleKey: "providerProfileSubtitle",
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
                            permissions: {read: "user"},
                            field: {
                                name: "user",
                                widget: "#DisplayCard",
                                label: "user",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["user.fullName", "user.name"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "averageRating",
                                widget: "#DisplayCard",
                                label: "rating",
                                widgetProps: {icon: "#Star", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "reviewCount",
                                widget: "#DisplayCard",
                                label: "ratingCount",
                                widgetProps: {icon: "#MessageSquare", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "completionRate",
                                widget: "#DisplayCard",
                                label: "completionRate",
                                widgetProps: {icon: "#CheckCircle", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "skills"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "skills"},
                            field: {
                                name: "skills",
                                widget: "#DisplayCard",
                                label: "skills",
                                widgetProps: {icon: "#Tag", valueType: "stringBadgeList"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "bio"},
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "bio"},
                            field: {
                                name: "bio",
                                widget: "#ExpandableText",
                                label: "bio",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {storageKey: "providerProfile.sheet.availability", defaultMode: "cards"},
            children: [
                {
                    render: "#SheetGroup",
                    dependent: "availability",
                    permissions: {read: "availability"},
                    props: {title: "availability", titleActions: "#ReferencesViewModeToggle"},
                    children: [
                        {
                            render: "div",
                            props: {className: "space-y-2"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "availability"},
                                    field: {
                                        name: "availability",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            cardColumns: 3,
                                            fields: [
                                                {
                                                    name: "dayOfWeek",
                                                    type: "text",
                                                    languageKeyCategory: "weekday",
                                                    labelKey: "dayOfWeek",
                                                    className: "text-sm font-medium",
                                                },
                                                {
                                                    name: "startTime",
                                                    type: "text",
                                                    labelKey: "startTime",
                                                    className: "text-sm",
                                                },
                                                {
                                                    name: "endTime",
                                                    type: "text",
                                                    labelKey: "endTime",
                                                    className: "text-sm",
                                                },
                                            ],
                                            compactSummaryFields: ["dayOfWeek", "startTime", "endTime"],
                                            compactSummaryJoinSeparator: " - ",
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
            props: {title: "portfolio"},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50 max-w-full"},
                    children: [
                        {
                            render: "#SheetMediaFilesStrip",
                            permissions: {read: "portfolio"},
                            field: {
                                name: "portfolio",
                                widget: "#SheetMediaFilesStrip",
                                label: "portfolio",
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const providerProfileEditFormView: ViewConfig = {
    model: "providerprofiles",
    viewType: "form",
    viewMode: "edit",
    accessModel: "providerprofiles",
    apiUrl: "/api/eCommerceMarketplace/providerProfile",
    method: "PATCH",
    nodes: [
        {
            render: "#TitleWithCollapse",
            props: {title: "form.section.profile"},
            children: [
                {
                    render: "#FormGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#Field",
                            field: {
                                name: "bio",
                                widget: "#Textarea",
                                label: "form.bioLabel",
                                widgetProps: {className: "min-h-[140px]"},
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "skills",
                                widget: "#StringArrayInput",
                                label: "form.skillsLabel",
                                placeholder: "form.skillsPlaceholder",
                                widgetProps: {
                                    removeTooltipKey: "form.skillsRemoveTooltip",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            // FormRepeater owns TitleWithCollapse when `title` is set so the add button
            // stays in the section header (inBetween), not below it.
            render: "#Field",
            permissions: {write: "availability"},
            field: {
                name: "availability",
                widget: "#FormRepeater",
                widgetProps: {
                    title: "form.section.availability",
                    arrayField: "availability",
                    defaultItem: {dayOfWeek: "1", startTime: "09:00", endTime: "17:00"},
                    addLabel: "form.availabilityAddRow",
                    removeLabel: "form.availabilityRemoveRow",
                    rowTitleFields: ["dayOfWeek", "startTime", "endTime"],
                    rowTitleSeparators: [" ", " - "],
                    rowTitlePlaceholder: "form.availabilityRowTitle",
                    rowTemplate: [
                        {
                            render: "#FormGrid",
                            props: {columns: 3},
                            children: [
                                {
                                    render: "#Field",
                                    field: {
                                        name: "dayOfWeek",
                                        widget: "#SimpleSelect",
                                        label: "form.dayOfWeekLabel",
                                        required: true,
                                        widgetProps: {options: weekdayOptions},
                                    },
                                },
                                {
                                    render: "#Field",
                                    field: {
                                        name: "startTime",
                                        widget: "#DateInput",
                                        label: "form.startTimeLabel",
                                        placeholder: "form.startTimePlaceholder",
                                        required: true,
                                        widgetProps: {valueFormat: "HH:mm", timeOnly: true},
                                    },
                                },
                                {
                                    render: "#Field",
                                    field: {
                                        name: "endTime",
                                        widget: "#DateInput",
                                        label: "form.endTimeLabel",
                                        placeholder: "form.endTimePlaceholder",
                                        required: true,
                                        widgetProps: {valueFormat: "HH:mm", timeOnly: true},
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
            props: {title: "form.section.portfolio"},
            permissions: {write: "portfolio"},
            children: [
                {
                    render: "#FormGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#Field",
                            field: {
                                name: "portfolio",
                                widget: "#MediaField",
                                label: "form.portfolioLabel",
                                widgetProps: {
                                    mediaType: "file",
                                    mode: "multiple",
                                    maxCount: 20,
                                },
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const providerProfileViews: ViewConfig[] = [providerProfileSheetView, providerProfileEditFormView];
