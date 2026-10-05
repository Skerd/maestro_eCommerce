import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {CATEGORY_NAME_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const categorySheetView: ViewConfig = {
    model: "productcategories",
    viewType: "sheet",
    accessModel: "productcategories",
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
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {icon: "#Tag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "slug"},
                            field: {
                                name: "slug",
                                widget: "#DisplayCard",
                                label: "slug",
                                widgetProps: {icon: "#IconInfoCircle"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#DisplayCard",
                                label: "order",
                                widgetProps: {icon: "#Hash", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "parent"},
                            field: {
                                name: "parent.name",
                                widget: "#DisplayCard",
                                label: "parentCategory",
                                widgetProps: {
                                    icon: "#IconCategory2",
                                    linkedRefPath: "parent",
                                    linkedSheetModel: "productcategories",
                                    linkedSheetWidget: "#CategorySheetView",
                                    linkedSheetEntityProp: "parent",
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

/** Create/edit: slug is generated server-side from name and is not editable. */
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
                    widgetProps: {maxLength: CATEGORY_NAME_MAX},
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
                    widgetProps: {maxLength: CATEGORY_NAME_MAX},
                }, permissions: {read: "name", write: "name"},
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
                }, permissions: {read: "parent", write: "parent"},
            },
            {
                render: "#Field",
                field: {
                    name: "order",
                    widget: "#Input",
                    label: "form.orderLabel",
                    placeholder: "form.orderPlaceholder",
                    widgetProps: {type: "number", min: 0, step: 1},
                }, permissions: {read: "order", write: "order"},
            },
        ],
    },
];

export const categoryCreateFormView: ViewConfig = {
    model: "productcategories",
    viewType: "form",
    viewMode: "create",
    accessModel: "productcategories",
    apiUrl: "/api/eCommerce/category",
    method: "PUT",
    nodes: categoryCreateFormNodes,
};

export const categoryEditFormView: ViewConfig = {
    model: "productcategories",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productcategories",
    apiUrl: "/api/eCommerce/category",
    method: "PATCH",
    nodes: categoryEditFormNodes,
};

export const categoryViews: ViewConfig[] = [categorySheetView, categoryCreateFormView, categoryEditFormView];
