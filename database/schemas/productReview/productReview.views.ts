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
    sheetWidget: "#ProductReviewSheetView",
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
                            dependent: "product",
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
                            dependent: "reviewer",
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
                        {
                            render: "#DisplayCard",
                            dependent: "order",
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
        lifecycleSheetGroup,
    ],
};

const ratingOptions = [
    {value: 5, label: "★★★★★ 5"},
    {value: 4, label: "★★★★ 4"},
    {value: 3, label: "★★★ 3"},
    {value: 2, label: "★★ 2"},
    {value: 1, label: "★ 1"},
];

const productReviewCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.purchaseSectionTitle"},
        children: [
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
                                normalizeEmptyToUndefined: true,
                                enableWhenFormFieldsNonEmpty: ["order"],
                                postBodyFromFormField: {field: "order", paramName: "productOrderId"},
                                remountKeyFormField: "order",
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.reviewSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "rating",
                            widget: "#SimpleSelect",
                            label: "form.ratingLabel",
                            placeholder: "form.ratingPlaceholder",
                            required: true,
                            widgetProps: {options: ratingOptions, className: "grow w-full"},
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
        ],
    },
];

const productReviewEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.reviewSectionTitle"},
        permissions: {readAny: ["rating", "title", "comment"], writeAny: ["rating", "title", "comment"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "rating", write: "rating"},
                        field: {
                            name: "rating",
                            widget: "#SimpleSelect",
                            label: "form.ratingLabel",
                            placeholder: "form.ratingPlaceholder",
                            required: true,
                            widgetProps: {options: ratingOptions, className: "grow w-full"},
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
        ],
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
