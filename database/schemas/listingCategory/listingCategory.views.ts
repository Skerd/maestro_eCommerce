import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const listingCategorySheetView: ViewConfig = {
    model: "listingcategories",
    viewType: "sheet",
    accessModel: "listingcategories",
    apiUrl: "/api/eCommerceMarketplace/listingCategory",
    header: {
        titleField: "name",
        subtitleKey: "listingCategorySubtitle",
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
                            permissions: {read: "parentListingCategory"},
                            field: {
                                name: "parentListingCategory.name",
                                widget: "#DisplayCard",
                                label: "parentListingCategory",
                                widgetProps: {
                                    icon: "#IconCategory2",
                                    linkedRefPath: "parentListingCategory",
                                    linkedSheetModel: "listingcategories",
                                    linkedSheetWidget: "#ListingCategorySheetView",
                                    linkedSheetEntityProp: "parentListingCategory",
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

/** Create/edit: slug is auto-generated on create (LCAT-{name}-{XXXXXXXX}) and is not editable. */
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
                    name: "parentListingCategory",
                    widget: "#ApiSelect",
                    label: "form.parentListingCategoryLabel",
                    placeholder: "form.parentListingCategoryPlaceholder",
                    widgetProps: {
                        apiUrl: "/api/eCommerceMarketplace/listingCategory/select",
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
                    name: "parentListingCategory",
                    widget: "#ApiSelect",
                    label: "form.parentListingCategoryLabel",
                    placeholder: "form.parentListingCategoryPlaceholder",
                    widgetProps: {
                        apiUrl: "/api/eCommerceMarketplace/listingCategory/select",
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

export const listingCategoryCreateFormView: ViewConfig = {
    model: "listingcategories",
    viewType: "form",
    viewMode: "create",
    accessModel: "listingcategories",
    apiUrl: "/api/eCommerceMarketplace/listingCategory",
    method: "PUT",
    nodes: categoryCreateFormNodes,
};

export const listingCategoryEditFormView: ViewConfig = {
    model: "listingcategories",
    viewType: "form",
    viewMode: "edit",
    accessModel: "listingcategories",
    apiUrl: "/api/eCommerceMarketplace/listingCategory",
    method: "PATCH",
    nodes: categoryEditFormNodes,
};

export const listingCategoryViews: ViewConfig[] = [listingCategorySheetView, listingCategoryCreateFormView, listingCategoryEditFormView];
