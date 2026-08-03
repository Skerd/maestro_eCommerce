import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const productOrderSheetView: ViewConfig = {
    model: "productOrders",
    viewType: "sheet",
    accessModel: "productOrders",
    apiUrl: "/api/eCommerce/productOrder",
    header: {titleField: "orderNumber", subtitleKey: "productOrderSubtitle", showCloseButton: true},
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
                            render: "#SmallInfoCard",
                            field: {
                                name: "orderNumber",
                                widget: "#SmallInfoCard",
                                label: "orderNumber",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "status",
                                widget: "#SmallInfoCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "productOrderStatus"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "paymentStatus",
                                widget: "#SmallInfoCard",
                                label: "paymentStatus",
                                widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "productOrderPaymentStatus"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "fulfillmentStatus",
                                widget: "#SmallInfoCard",
                                label: "fulfillmentStatus",
                                widgetProps: {icon: "#IconTruck", languageKeyCategory: "productOrderFulfillmentStatus"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "customer",
                                widget: "#SmallInfoCard",
                                label: "customer",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "customer",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "company",
                                widget: "#SmallInfoCard",
                                label: "company",
                                widgetProps: {
                                    icon: "#IconBuilding",
                                    parent: "company",
                                    valuePath: ["name"],
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "email",
                                widget: "#SmallInfoCard",
                                label: "email",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "phone",
                                widget: "#SmallInfoCard",
                                label: "phone",
                                widgetProps: {icon: "#IconPhone"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "currency",
                                widget: "#SmallInfoCard",
                                label: "currency",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    parent: "currency",
                                    valuePath: ["symbol", "name"],
                                    joinSeparator: " ",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.items.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "items",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "items",
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "items",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            cardColumns: 3,
                                            compactSummaryFields: ["product", "quantity", "totalPrice"],
                                            fields: [
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "sku"],
                                                    joinSeparator: " · ",
                                                    labelKey: "itemProduct",
                                                    linkedSheetModel: "products",
                                                    linkedSheetWidget: "#ProductSheetView",
                                                    linkedSheetEntityProp: "product",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "variant",
                                                    type: "linkedRef",
                                                    className: "text-sm",
                                                    valuePath: ["sku"],
                                                    labelKey: "itemVariant",
                                                    linkedSheetModel: "productVariants",
                                                    linkedSheetWidget: "#ProductVariantSheetView",
                                                    linkedSheetEntityProp: "entity",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "snapshot.title",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemSnapshotTitle",
                                                },
                                                {
                                                    name: "snapshot.sku",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemSnapshotSku",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantity",
                                                },
                                                {
                                                    name: "unitPrice",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemUnitPrice",
                                                    currencyField: "currency",
                                                },
                                                {
                                                    name: "totalPrice",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemTotalPrice",
                                                    currencyField: "currency",
                                                },
                                                {
                                                    name: "currency",
                                                    type: "text",
                                                    className: "text-sm",
                                                    valuePath: ["symbol", "abbreviation"],
                                                    joinSeparator: " ",
                                                    labelKey: "currency",
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "shippingAddress", defaultOpen: false},
            dependent: "shippingAddress",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.firstName",
                                widget: "#SmallInfoCard",
                                label: "addressFirstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.lastName",
                                widget: "#SmallInfoCard",
                                label: "addressLastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.phone",
                                widget: "#SmallInfoCard",
                                label: "addressPhone",
                                widgetProps: {icon: "#IconPhone"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.street",
                                widget: "#SmallInfoCard",
                                label: "addressStreet",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.city",
                                widget: "#SmallInfoCard",
                                label: "addressCity",
                                widgetProps: {icon: "#IconBuilding"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.state",
                                widget: "#SmallInfoCard",
                                label: "addressState",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.postalCode",
                                widget: "#SmallInfoCard",
                                label: "addressPostalCode",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingAddress.country",
                                widget: "#SmallInfoCard",
                                label: "addressCountry",
                                widgetProps: {
                                    icon: "#Globe",
                                    parent: "shippingAddress.country",
                                    valuePath: ["name"],
                                    linkedRefPath: "shippingAddress.country",
                                    linkedSheetModel: "countries",
                                    linkedSheetWidget: "#CountrySheetView",
                                    linkedSheetEntityProp: "country",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "billingAddress", defaultOpen: false},
            dependent: "billingAddress",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.firstName",
                                widget: "#SmallInfoCard",
                                label: "addressFirstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.lastName",
                                widget: "#SmallInfoCard",
                                label: "addressLastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.phone",
                                widget: "#SmallInfoCard",
                                label: "addressPhone",
                                widgetProps: {icon: "#IconPhone"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.street",
                                widget: "#SmallInfoCard",
                                label: "addressStreet",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.city",
                                widget: "#SmallInfoCard",
                                label: "addressCity",
                                widgetProps: {icon: "#IconBuilding"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.state",
                                widget: "#SmallInfoCard",
                                label: "addressState",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.postalCode",
                                widget: "#SmallInfoCard",
                                label: "addressPostalCode",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "billingAddress.country",
                                widget: "#SmallInfoCard",
                                label: "addressCountry",
                                widgetProps: {
                                    icon: "#Globe",
                                    parent: "billingAddress.country",
                                    valuePath: ["name"],
                                    linkedRefPath: "billingAddress.country",
                                    linkedSheetModel: "countries",
                                    linkedSheetWidget: "#CountrySheetView",
                                    linkedSheetEntityProp: "country",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "totals", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "subtotal",
                                widget: "#SmallInfoCard",
                                label: "subtotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "discountTotal",
                                widget: "#SmallInfoCard",
                                label: "discountTotal",
                                widgetProps: {icon: "#IconPercent", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingTotal",
                                widget: "#SmallInfoCard",
                                label: "shippingTotal",
                                widgetProps: {icon: "#IconTruck", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "taxTotal",
                                widget: "#SmallInfoCard",
                                label: "taxTotal",
                                widgetProps: {icon: "#IconReceipt", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "grandTotal",
                                widget: "#SmallInfoCard",
                                label: "grandTotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "shippingRate", defaultOpen: false},
            dependent: "shippingRate",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingRate.name",
                                widget: "#SmallInfoCard",
                                label: "shippingRateName",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingRate.carrier",
                                widget: "#SmallInfoCard",
                                label: "shippingRateCarrier",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "shippingRate.price",
                                widget: "#SmallInfoCard",
                                label: "shippingRatePrice",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.appliedDiscounts.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "appliedDiscounts",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "appliedDiscounts",
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "appliedDiscounts",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["discount", "amount"],
                                            fields: [
                                                {
                                                    name: "discount",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "code"],
                                                    joinSeparator: " · ",
                                                    labelKey: "discount",
                                                    linkedSheetModel: "discounts",
                                                    linkedSheetWidget: "#DiscountSheetView",
                                                    linkedSheetEntityProp: "discount",
                                                    icon: "#IconPercent",
                                                },
                                                {
                                                    name: "amount",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "discountAmount",
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.taxBreakdown.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "taxBreakdown",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "taxBreakdown",
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "taxBreakdown",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["name", "rate", "amount"],
                                            fields: [
                                                {
                                                    name: "name",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "taxName",
                                                },
                                                {
                                                    name: "rate",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "taxRate",
                                                },
                                                {
                                                    name: "amount",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "taxAmount",
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "giftCard", defaultOpen: false},
            dependent: "giftCard",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "giftCard.giftCard",
                                widget: "#SmallInfoCard",
                                label: "giftCardRef",
                                widgetProps: {
                                    icon: "#IconGift",
                                    parent: "giftCard.giftCard",
                                    valuePath: ["code"],
                                    linkedRefPath: "giftCard.giftCard",
                                    linkedSheetModel: "giftCards",
                                    linkedSheetWidget: "#GiftCardSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "giftCard.code",
                                widget: "#SmallInfoCard",
                                label: "giftCardCode",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "giftCard.amount",
                                widget: "#SmallInfoCard",
                                label: "giftCardAmount",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "notes", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "notes",
                                widget: "#SmallInfoCard",
                                label: "notes",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "internalNotes",
                                widget: "#SmallInfoCard",
                                label: "internalNotes",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.timeline.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "timeline",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependent: "timeline",
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "timeline",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            compactSummaryFields: ["event", "timestamp"],
                                            fields: [
                                                {
                                                    name: "event",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    languageKeyCategory: "productOrderTimelineEvent",
                                                    labelKey: "timelineEvent",
                                                },
                                                {
                                                    name: "timestamp",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "dateTime",
                                                    labelKey: "timelineTimestamp",
                                                },
                                                {
                                                    name: "user",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    valuePath: ["name", "surname"],
                                                    joinSeparator: " ",
                                                    labelKey: "timelineUser",
                                                },
                                                {
                                                    name: "note",
                                                    type: "expandableText",
                                                    className: "text-sm",
                                                    labelKey: "timelineNote",
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.paymentTransactions.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "paymentTransactions",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "paymentTransactions",
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    field: {
                                        name: "paymentTransactions",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#PaymentTransactionCard",
                                            itemDataProp: "entity",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconCreditCard",
                                                label: "paymentTransaction",
                                                valuePath: ["type", "status", "amount", "currency.symbol", "gateway"],
                                                valueLanguageKeyCategories: [
                                                    "paymentTransactionType",
                                                    "paymentTransactionStatus",
                                                    null,
                                                    null,
                                                    "paymentTransactionGateway",
                                                ],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "paymentTransactions",
                                                linkedSheetWidget: "#PaymentTransactionSheetView",
                                                linkedSheetEntityProp: "entity",
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "payment", defaultOpen: false},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "stripePaymentIntentId",
                                widget: "#SmallInfoCard",
                                label: "stripePaymentIntentId",
                                widgetProps: {icon: "#IconCreditCard"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "idempotencyKey",
                                widget: "#SmallInfoCard",
                                label: "idempotencyKey",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const productOrderViews: ViewConfig[] = [productOrderSheetView];
