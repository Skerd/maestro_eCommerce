import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

/**
 * Reviews are created by buyers through the API (purchase-gated) — the panel
 * only moderates (view / delete / restore), so this ships sheet-only.
 * Related fields are single refs (order, product, reviewer) — linked sheets
 * where widgets exist; company comes from ownershipPlugin (not shown here).
 */
export const productReviewSheetView: ViewConfig = {
    model: "productReviews",
    viewType: "sheet",
    accessModel: "productReviews",
    apiUrl: "/api/eCommerce/productReview",
    header: {
        titleField: "displayTitle",
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

export const productReviewViews: ViewConfig[] = [productReviewSheetView];
