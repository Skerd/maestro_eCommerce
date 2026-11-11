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
            dependentAny: ["parent"],
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "parent",
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
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle"},
        children: [
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
                ],
            },
        ],
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
                            name: "order",
                            widget: "#Input",
                            label: "form.orderLabel",
                            placeholder: "form.orderPlaceholder",
                            widgetProps: {type: "number", min: 0, step: 1},
                        },
                    },
                ],
            },
        ],
    },
];

const categoryEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle"},
        permissions: {readAny: ["name", "parent"], writeAny: ["name", "parent"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "name", write: "name"},
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
                        permissions: {read: "parent", write: "parent"},
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
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.visibilitySectionTitle"},
        permissions: {readAny: ["order"], writeAny: ["order"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "order", write: "order"},
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
