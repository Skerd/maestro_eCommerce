import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const listingPackageSheetView: ViewConfig = {
    model: "listingpackages",
    viewType: "sheet",
    accessModel: "listingpackages",
    apiUrl: "/api/eCommerceMarketplace/listingPackage",
    header: {
        titleField: "name",
        subtitleKey: "listingPackageSubtitle",
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
                                widgetProps: {icon: "#IconLabel"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "listing"},
                            field: {
                                name: "listing",
                                widget: "#DisplayCard",
                                label: "listing",
                                widgetProps: {
                                    icon: "#LayoutList",
                                    valuePath: ["listing.title"],
                                    linkedRefPath: "listing",
                                    linkedSheetModel: "listings",
                                    linkedSheetWidget: "#ListingSheetView",
                                    linkedSheetEntityProp: "listing",
                                    linkedSheetValueField: "title",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "provider"},
                            field: {
                                name: "provider",
                                widget: "#DisplayCard",
                                label: "provider",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["provider.name", "provider.surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "price"},
                            field: {
                                name: "price.amount",
                                widget: "#DisplayCard",
                                label: "priceAmount",
                                widgetProps: {
                                    icon: "#DollarSign",
                                    valuePath: ["price.currency.symbol", "price.amount"],
                                    joinSeparator: " ",
                                    format: "locale",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "price"},
                            field: {
                                name: "price.currency",
                                widget: "#DisplayCard",
                                label: "currency",
                                widgetProps: {
                                    icon: "#Coins",
                                    valuePath: ["price.currency.symbol", "price.currency.name"],
                                    joinSeparator: " ",
                                    linkedRefPath: "price.currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                    linkedSheetValueField: "name",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "order"},
                            field: {
                                name: "order",
                                widget: "#DisplayCard",
                                label: "displayOrder",
                                widgetProps: {icon: "#Hash", format: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "deliveryDays"},
                            field: {
                                name: "deliveryDays",
                                widget: "#DisplayCard",
                                label: "deliveryDays",
                                widgetProps: {icon: "#Clock", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "description"},
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "description"},
                            field: {
                                name: "description",
                                widget: "#ExpandableText",
                                label: "description",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const listingPackageFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "listing",
                    widget: "#ApiSelect",
                    label: "form.listingIdLabel",
                    required: true,
                    widgetProps: {apiUrl: "/api/eCommerceMarketplace/listing/select"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "price.amount",
                    widget: "#Input",
                    label: "form.priceAmountLabel",
                    required: true,
                    widgetProps: {type: "number", min: 0, step: "any"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "price.currency",
                    widget: "#ApiSelect",
                    label: "form.currencyLabel",
                    required: true,
                    widgetProps: {apiUrl: "/api/finance/currency/select"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "deliveryDays",
                    widget: "#Input",
                    label: "form.deliveryDaysLabel",
                    required: true,
                    widgetProps: {type: "number", min: 0, step: 1},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "order",
                    widget: "#Input",
                    label: "form.sortOrderLabel",
                    widgetProps: {type: "number", min: 0, step: 1},
                },
            },
        ],
    },
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    widgetProps: {className: "min-h-[80px] max-h-[200px] resize-none overflow-y-auto"},
                },
            },
        ],
    },
];

const listingPackageEditId: ViewConfig["nodes"] = [
    {
        render: "#Field",
        field: {
            name: "_id",
            widget: "#Input",
            label: "form.idLabel",
            required: true,
            widgetProps: {type: "hidden"},
        },
    },
];

export const listingPackageCreateFormView: ViewConfig = {
    model: "listingpackages",
    viewType: "form",
    viewMode: "create",
    accessModel: "listingpackages",
    apiUrl: "/api/eCommerceMarketplace/listingPackage",
    method: "PUT",
    nodes: listingPackageFormFields,
};

export const listingPackageEditFormView: ViewConfig = {
    model: "listingpackages",
    viewType: "form",
    viewMode: "edit",
    accessModel: "listingpackages",
    apiUrl: "/api/eCommerceMarketplace/listingPackage",
    method: "PATCH",
    nodes: [...listingPackageEditId, ...listingPackageFormFields],
};

export const listingPackageViews: ViewConfig[] = [
    listingPackageSheetView,
    listingPackageCreateFormView,
    listingPackageEditFormView,
];
