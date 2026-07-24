import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

/**
 * Reviews are created by buyers through the API (purchase-gated) — the panel
 * only moderates (view / delete / restore), so this ships sheet-only.
 */
export const productReviewSheetView: ViewConfig = {
    model: "productReviews",
    viewType: "sheet",
    accessModel: "productReviews",
    apiUrl: "/api/eCommerce/productReview",
    header: {titleField: "title", subtitleKey: "productReviewSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "rating", widget: "#SmallInfoCard", label: "rating", widgetProps: {icon: "#IconStar"}}},
                        {render: "#SmallInfoCard", field: {name: "title", widget: "#SmallInfoCard", label: "title", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", field: {name: "comment", widget: "#SmallInfoCard", label: "comment", widgetProps: {icon: "#IconNote"}}},
                        {render: "#SmallInfoCard", field: {name: "createdAt", widget: "#SmallInfoCard", label: "createdAt", widgetProps: {icon: "#Calendar"}}},
                    ],
                },
            ],
        },
    ],
};

export const productReviewViews: ViewConfig[] = [productReviewSheetView];
