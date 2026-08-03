import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const customerGroupFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", placeholder: "form.namePlaceholder", required: true}},
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {className: "resize-none max-h-[200px] overflow-y-auto"},
                },
            },
        ],
    },
];

export const customerGroupSheetView: ViewConfig = {
    model: "customerGroups",
    viewType: "sheet",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    header: {titleField: "name", subtitleKey: "customerGroupSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#Tag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "memberCount"}, field: {name: "memberCount", widget: "#SmallInfoCard", label: "memberCount", widgetProps: {icon: "#IconUsers"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "isDefault"},
                            field: {
                                name: "isDefault",
                                widget: "#SmallInfoCard",
                                label: "isDefault",
                                widgetProps: {icon: "#IconStar", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "company"},
                            field: {
                                name: "company",
                                widget: "#SmallInfoCard",
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
            props: {title: "description"},
            dependent: "description",
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
                                widgetProps: {className: "text-sm"},
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
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdAt"},
                            field: {
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "updatedAt"},
                            field: {
                                name: "updatedAt",
                                widget: "#SmallInfoCard",
                                label: "updatedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdBy"},
                            field: {
                                name: "createdBy",
                                widget: "#SmallInfoCard",
                                label: "createdBy",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "createdBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            dependent: "deletedAt",
                            permissions: {read: "deletedAt"},
                            field: {
                                name: "deletedAt",
                                widget: "#SmallInfoCard",
                                label: "deletedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            dependent: "deletedBy",
                            permissions: {read: "deletedBy"},
                            field: {
                                name: "deletedBy",
                                widget: "#SmallInfoCard",
                                label: "deletedBy",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "deletedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const customerGroupCreateFormView: ViewConfig = {
    model: "customerGroups",
    viewType: "form",
    viewMode: "create",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    method: "PUT",
    nodes: customerGroupFormFields,
};

export const customerGroupEditFormView: ViewConfig = {
    model: "customerGroups",
    viewType: "form",
    viewMode: "edit",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    method: "PATCH",
    nodes: customerGroupFormFields,
};

export const customerGroupViews: ViewConfig[] = [customerGroupSheetView, customerGroupCreateFormView, customerGroupEditFormView];
