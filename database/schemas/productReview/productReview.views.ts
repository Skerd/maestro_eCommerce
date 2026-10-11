import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {
    PRODUCT_REVIEW_COMMENT_MAX,
    PRODUCT_REVIEW_TITLE_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/productReview/productReview.schema-def";

const textareaScrollClass = "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto";

export const productReviewSheetView: ViewConfig = {
    model: "productReviews",
    viewType: "sheet",
    accessModel: "productReviews",
    apiUrl: "/api/eCommerce/productReview",
    header: {
        titleField: "title",
        subtitleKey: "productReviewSubtitle",
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
                            permissions: {read: "rating"},
                            field: {
                                name: "rating",
                                widget: "#DisplayCard",
                                label: "rating",
                                widgetProps: {icon: "#IconStar"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "title"},
                            field: {
                                name: "title",
                                widget: "#DisplayCard",
                                label: "title",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "content", defaultOpen: true},
            dependent: "comment",
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "comment"},
                            field: {
                                name: "comment",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm whitespace-pre-wrap"},
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
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#DisplayCard",
                                label: "order",
                                widgetProps: {
                                    icon: "#IconShoppingCart",
                                    parent: "order",
                                    valuePath: ["orderNumber"],
                                    linkedRefPath: "order",
                                    linkedSheetModel: "productOrders",
                                    linkedSheetWidget: "#ProductOrderSheetView",
                                    linkedSheetEntityProp: "order",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "product"},
                            field: {
                                name: "product",
                                widget: "#DisplayCard",
                                label: "product",
                                widgetProps: {
                                    icon: "#IconPackage",
                                    parent: "product",
                                    valuePath: ["title"],
                                    linkedRefPath: "product",
                                    linkedSheetModel: "products",
                                    linkedSheetWidget: "#ProductSheetView",
                                    linkedSheetEntityProp: "product",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "reviewer"},
                            field: {
                                name: "reviewer",
                                widget: "#DisplayCard",
                                label: "reviewer",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "reviewer",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
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

const productReviewCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "order",
                    widget: "#ApiSelect",
                    label: "form.orderLabel",
                    placeholder: "form.orderPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerce/productOrder/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                        cascadeClearFormFields: ["product"],
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "product",
                    widget: "#ApiSelect",
                    label: "form.productLabel",
                    placeholder: "form.productPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerce/product/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                        enableWhenFormFieldsNonEmpty: ["order"],
                        postBodyFromFormField: {field: "order", paramName: "productOrderId"},
                        remountKeyFormField: "order",
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "rating",
                    widget: "#Input",
                    label: "form.ratingLabel",
                    placeholder: "form.ratingPlaceholder",
                    required: true,
                    widgetProps: {type: "number", min: 1, max: 5, step: 1},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "title",
                    widget: "#Input",
                    label: "form.titleLabel",
                    placeholder: "form.titlePlaceholder",
                    widgetProps: {maxLength: PRODUCT_REVIEW_TITLE_MAX},
                },
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "comment",
            widget: "#Textarea",
            label: "form.commentLabel",
            placeholder: "form.commentPlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: PRODUCT_REVIEW_COMMENT_MAX},
        },
    },
];

const productReviewEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        permissions: {writeAny: ["rating", "title", "comment"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "rating", write: "rating"},
                field: {
                    name: "rating",
                    widget: "#Input",
                    label: "form.ratingLabel",
                    placeholder: "form.ratingPlaceholder",
                    required: true,
                    widgetProps: {type: "number", min: 1, max: 5, step: 1},
                },
            },
            {
                render: "#Field",
                permissions: {read: "title", write: "title"},
                field: {
                    name: "title",
                    widget: "#Input",
                    label: "form.titleLabel",
                    placeholder: "form.titlePlaceholder",
                    widgetProps: {maxLength: PRODUCT_REVIEW_TITLE_MAX},
                },
            },
        ],
    },
    {
        render: "#Field",
        permissions: {read: "comment", write: "comment"},
        field: {
            name: "comment",
            widget: "#Textarea",
            label: "form.commentLabel",
            placeholder: "form.commentPlaceholder",
            widgetProps: {rows: 4, className: textareaScrollClass, maxLength: PRODUCT_REVIEW_COMMENT_MAX},
        },
    },
];

export const productReviewCreateFormView: ViewConfig = {
    model: "productReviews",
    viewType: "form",
    viewMode: "create",
    accessModel: "productReviews",
    apiUrl: "/api/eCommerce/productReview",
    method: "PUT",
    nodes: productReviewCreateFormNodes,
};

export const productReviewEditFormView: ViewConfig = {
    model: "productReviews",
    viewType: "form",
    viewMode: "edit",
    accessModel: "productReviews",
    apiUrl: "/api/eCommerce/productReview",
    method: "PATCH",
    nodes: productReviewEditFormNodes,
};

export const productReviewViews: ViewConfig[] = [
    productReviewSheetView,
    productReviewCreateFormView,
    productReviewEditFormView,
];
