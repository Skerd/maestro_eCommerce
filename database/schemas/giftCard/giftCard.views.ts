import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

/**
 * Gift cards are system-issued (paid orders containing gift_card products) and
 * redeemed at cart/checkout — the panel only inspects and disables them, so
 * this ships sheet-only.
 */
export const giftCardSheetView: ViewConfig = {
    model: "giftCards",
    viewType: "sheet",
    accessModel: "giftCards",
    apiUrl: "/api/eCommerce/giftCard",
    header: {titleField: "code", subtitleKey: "giftCardSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "code", widget: "#SmallInfoCard", label: "code", widgetProps: {icon: "#IconGift"}}},
                        {render: "#SmallInfoCard", field: {name: "status", widget: "#SmallInfoCard", label: "status", widgetProps: {icon: "#Tag", languageKeyCategory: "giftCardStatus"}}},
                        {render: "#SmallInfoCard", field: {name: "balance", widget: "#SmallInfoCard", label: "balance", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "initialBalance", widget: "#SmallInfoCard", label: "initialBalance", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", field: {name: "expiresAt", widget: "#SmallInfoCard", label: "expiresAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", field: {name: "createdAt", widget: "#SmallInfoCard", label: "createdAt", widgetProps: {icon: "#Calendar"}}},
                    ],
                },
            ],
        },
    ],
};

export const giftCardViews: ViewConfig[] = [giftCardSheetView];
