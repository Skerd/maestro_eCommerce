import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const categorySheetView: ViewConfig = {
    model: "categories",
    viewType: "sheet",
    accessModel: "listingCategories",
    apiUrl: "/api/eCommerce/category",
    header: {
        titleField: "name",
        subtitleKey: "categorySubtitle",
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
                            render: "#SmallInfoCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#SmallInfoCard",
                                label: "name",
                                widgetProps: {icon: "#Tag"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "slug"},
                            field: {
                                name: "slug",
                                widget: "#SmallInfoCard",
                                label: "slug",
                                widgetProps: {icon: "#IconInfoCircle"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#SmallInfoCard",
                                label: "order",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "parent.name",
                                widget: "#SmallInfoCard",
                                label: "parentCategory",
                                widgetProps: {
                                    icon: "#IconCategory2",
                                    linkedRefPath: "parent",
                                    linkedSheetModel: "listingCategories",
                                    linkedSheetWidget: "#CategorySheetView",
                                    linkedSheetEntityProp: "parent",
                                },
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

/** Create: optional slug (generated server-side when omitted); optional parent. */
const categoryCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "slug",
                    widget: "#Input",
                    label: "form.slugLabel",
                    placeholder: "form.slugPlaceholder",
                    required: false,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "parentId",
                    widget: "#ApiSelect",
                    label: "form.parentCategoryLabel",
                    placeholder: "form.parentCategoryPlaceholder",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/category/select",
                        normalizeEmptyToUndefined: true,
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "order",
                    widget: "#Input",
                    label: "form.orderLabel",
                    placeholder: "form.orderPlaceholder",
                    widgetProps: {type: "number", min: 0, step: 1},
                },
            },
        ],
    },
];

const categoryEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "slug",
                    widget: "#Input",
                    label: "form.slugLabel",
                    placeholder: "form.slugPlaceholder",
                    required: false,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "parent",
                    widget: "#ApiSelect",
                    label: "form.parentCategoryLabel",
                    placeholder: "form.parentCategoryPlaceholder",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/category/select",
                        normalizeEmptyToUndefined: true,
                        postBodyFormExtrasMerge: {excludeCategoryId: "categoryId"},
                        remountKeyFormField: "_id",
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "order",
                    widget: "#Input",
                    label: "form.orderLabel",
                    placeholder: "form.orderPlaceholder",
                    widgetProps: {type: "number", min: 0, step: 1},
                },
            },
        ],
    },
];

export const categoryCreateFormView: ViewConfig = {
    model: "categories",
    viewType: "form",
    viewMode: "create",
    accessModel: "listingCategories",
    apiUrl: "/api/eCommerce/category",
    method: "PUT",
    nodes: categoryCreateFormNodes,
};

export const categoryEditFormView: ViewConfig = {
    model: "categories",
    viewType: "form",
    viewMode: "edit",
    accessModel: "listingCategories",
    apiUrl: "/api/eCommerce/category",
    method: "PATCH",
    nodes: categoryEditFormNodes,
};

export const categoryViews: ViewConfig[] = [categorySheetView, categoryCreateFormView, categoryEditFormView];
