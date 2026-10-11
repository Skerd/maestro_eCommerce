import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {SAVED_SEARCH_NAME_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const savedSearchSortOptions = [
    {value: "newest", label: "form.sort.newest"},
    {value: "priceAsc", label: "form.sort.priceAsc"},
    {value: "priceDesc", label: "form.sort.priceDesc"},
    {value: "featured", label: "form.sort.featured"},
];

export const savedSearchSheetView: ViewConfig = {
    model: "savedsearches",
    viewType: "sheet",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    header: {
        titleField: "name",
        subtitleKey: "savedSearchSubtitle",
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
                            field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#Tag"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "customer"},
                            field: {
                                name: "customer",
                                widget: "#DisplayCard",
                                label: "customer",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "customer",
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
            permissions: {readAny: ["categoryIds", "collectionId", "priceMin", "priceMax", "sort"]},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "collectionId"},
                            field: {
                                name: "collectionId",
                                widget: "#DisplayCard",
                                label: "collectionId",
                                widgetProps: {
                                    icon: "#Tag",
                                    parent: "collectionId",
                                    valuePath: ["name"],
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "priceMin"},
                            field: {name: "priceMin", widget: "#DisplayCard", label: "priceMin", widgetProps: {icon: "#Hash", type: "number"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "priceMax"},
                            field: {name: "priceMax", widget: "#DisplayCard", label: "priceMax", widgetProps: {icon: "#Hash", type: "number"}},
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "sort"},
                            field: {name: "sort", widget: "#DisplayCard", label: "sort", widgetProps: {icon: "#Hash"}},
                        },
                    ],
                },
                {
                    render: "#SheetGroup",
                    props: {title: "categoryIds", defaultOpen: true, collapsible: false},
                    permissions: {read: "categoryIds"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "categoryIds"},
                                    field: {
                                        name: "categoryIds",
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
                                                linkedSheetModel: "productcategories",
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
        lifecycleSheetGroup,
    ],
};

const savedSearchCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "customer",
                    widget: "#ApiSelect",
                    label: "form.customerLabel",
                    placeholder: "form.customerPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/company/users/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                        defaultOptionsFormExtraKey: "customerDefaultOptions",
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                    widgetProps: {maxLength: SAVED_SEARCH_NAME_MAX},
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.filtersSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "collectionId",
                            widget: "#ApiSelect",
                            label: "form.collectionIdLabel",
                            placeholder: "form.collectionIdPlaceholder",
                            widgetProps: {
                                apiUrl: "/api/eCommerce/collection/select",
                                method: "POST",
                                normalizeEmptyToUndefined: true,
                                defaultOptionsFormExtraKey: "collectionIdDefaultOptions",
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "priceMin",
                            widget: "#Input",
                            label: "form.priceMinLabel",
                            placeholder: "form.priceMinPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "priceMax",
                            widget: "#Input",
                            label: "form.priceMaxLabel",
                            placeholder: "form.priceMaxPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "sort",
                            widget: "#Select",
                            label: "form.sortLabel",
                            placeholder: "form.sortPlaceholder",
                            widgetProps: {
                                options: savedSearchSortOptions,
                                className: "grow w-full",
                            },
                        },
                    },
                ],
            },
            {
                render: "#Field",
                field: {
                    name: "categoryIds",
                    widget: "#ObjectIdChipsInput",
                    label: "form.categoryIdsLabel",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/category/select",
                        method: "POST",
                        placeholderKey: "form.selectCategory",
                        removeTooltipKey: "form.removeCategory",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "categoryIds",
                    },
                },
            },
        ],
    },
];

const savedSearchEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        permissions: {writeAny: ["customer", "name"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "customer", write: "customer"},
                field: {
                    name: "customer",
                    widget: "#ApiSelect",
                    label: "form.customerLabel",
                    placeholder: "form.customerPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/company/users/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                        defaultOptionsFormExtraKey: "customerDefaultOptions",
                    },
                },
            },
            {
                render: "#Field",
                permissions: {read: "name", write: "name"},
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                    widgetProps: {maxLength: SAVED_SEARCH_NAME_MAX},
                },
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.filtersSectionTitle"},
        permissions: {readAny: ["categoryIds", "collectionId", "priceMin", "priceMax", "sort"], writeAny: ["categoryIds", "collectionId", "priceMin", "priceMax", "sort"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "collectionId", write: "collectionId"},
                        field: {
                            name: "collectionId",
                            widget: "#ApiSelect",
                            label: "form.collectionIdLabel",
                            placeholder: "form.collectionIdPlaceholder",
                            widgetProps: {
                                apiUrl: "/api/eCommerce/collection/select",
                                method: "POST",
                                normalizeEmptyToUndefined: true,
                                defaultOptionsFormExtraKey: "collectionIdDefaultOptions",
                            },
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "priceMin", write: "priceMin"},
                        field: {
                            name: "priceMin",
                            widget: "#Input",
                            label: "form.priceMinLabel",
                            placeholder: "form.priceMinPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "priceMax", write: "priceMax"},
                        field: {
                            name: "priceMax",
                            widget: "#Input",
                            label: "form.priceMaxLabel",
                            placeholder: "form.priceMaxPlaceholder",
                            widgetProps: {type: "number", min: 0},
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "sort", write: "sort"},
                        field: {
                            name: "sort",
                            widget: "#Select",
                            label: "form.sortLabel",
                            placeholder: "form.sortPlaceholder",
                            widgetProps: {
                                options: savedSearchSortOptions,
                                className: "grow w-full",
                            },
                        },
                    },
                ],
            },
            {
                render: "#Field",
                permissions: {read: "categoryIds", write: "categoryIds"},
                field: {
                    name: "categoryIds",
                    widget: "#ObjectIdChipsInput",
                    label: "form.categoryIdsLabel",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/category/select",
                        method: "POST",
                        placeholderKey: "form.selectCategory",
                        removeTooltipKey: "form.removeCategory",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "categoryIds",
                    },
                },
            },
        ],
    },
];

export const savedSearchCreateFormView: ViewConfig = {
    model: "savedsearches",
    viewType: "form",
    viewMode: "create",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    method: "PUT",
    nodes: savedSearchCreateFormNodes,
};

export const savedSearchEditFormView: ViewConfig = {
    model: "savedsearches",
    viewType: "form",
    viewMode: "edit",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    method: "PATCH",
    nodes: savedSearchEditFormNodes,
};

export const savedSearchViews: ViewConfig[] = [
    savedSearchSheetView,
    savedSearchCreateFormView,
    savedSearchEditFormView,
];
