import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const savedSearchFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    required: true,
                },
            },
        ],
    },
];

export const savedSearchSheetView: ViewConfig = {
    model: "savedsearches",
    viewType: "sheet",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    header: {
        titleField: "name",
        subtitleKey: "eCommerce.savedSearch",
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
                            permissions: {read: "name"},
                            field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#IconTag"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "user"},
                            field: {
                                name: "user",
                                widget: "#DisplayCard",
                                label: "user",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "user",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "filters", defaultOpen: true},
            children: [
                {
                    render: "#ExpandableText",
                    permissions: {read: "filters"},
                    field: {
                        name: "filters",
                        widget: "#ExpandableText",
                        label: "filters",
                        widgetProps: {className: "text-sm whitespace-pre-wrap font-mono"},
                    },
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "deletion", defaultOpen: false},
            dependent: "deletedAt",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "deletedAt"},
                            field: {
                                name: "deletedAt",
                                widget: "#DisplayCard",
                                label: "deletedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "deletedBy"},
                            field: {
                                name: "deletedBy",
                                widget: "#DisplayCard",
                                label: "deletedBy",
                                widgetProps: {
                                    icon: "#IconUser",
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

export const savedSearchCreateFormView: ViewConfig = {
    model: "savedsearches",
    viewType: "form",
    viewMode: "create",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    method: "PUT",
    nodes: savedSearchFormFields,
};

export const savedSearchEditFormView: ViewConfig = {
    model: "savedsearches",
    viewType: "form",
    viewMode: "edit",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    method: "PATCH",
    nodes: savedSearchFormFields,
};

export const savedSearchViews: ViewConfig[] = [
    savedSearchSheetView,
    savedSearchCreateFormView,
    savedSearchEditFormView,
];
