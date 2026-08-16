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
                            render: "#DisplayCard",
                            field: {
                                name: "orderNumber",
                                widget: "#DisplayCard",
                                label: "orderNumber",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "productOrderStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "paymentStatus",
                                widget: "#DisplayCard",
                                label: "paymentStatus",
                                widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "productOrderPaymentStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fulfillmentStatus",
                                widget: "#DisplayCard",
                                label: "fulfillmentStatus",
                                widgetProps: {icon: "#IconTruck", languageKeyCategory: "productOrderFulfillmentStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "customer",
                                widget: "#DisplayCard",
                                label: "customer",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "customer",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "company",
                                widget: "#DisplayCard",
                                label: "company",
                                widgetProps: {
                                    icon: "#IconBuilding",
                                    parent: "company",
                                    valuePath: ["name"],
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "email",
                                widget: "#DisplayCard",
                                label: "email",
                                widgetProps: {icon: "#IconMail", type: "email"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "phone",
                                widget: "#DisplayCard",
                                label: "phone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "currency",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.firstName",
                                widget: "#DisplayCard",
                                label: "addressFirstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.lastName",
                                widget: "#DisplayCard",
                                label: "addressLastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.phone",
                                widget: "#DisplayCard",
                                label: "addressPhone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.street",
                                widget: "#DisplayCard",
                                label: "addressStreet",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.city",
                                widget: "#DisplayCard",
                                label: "addressCity",
                                widgetProps: {icon: "#IconBuilding"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.state",
                                widget: "#DisplayCard",
                                label: "addressState",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.postalCode",
                                widget: "#DisplayCard",
                                label: "addressPostalCode",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingAddress.country",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.firstName",
                                widget: "#DisplayCard",
                                label: "addressFirstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.lastName",
                                widget: "#DisplayCard",
                                label: "addressLastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.phone",
                                widget: "#DisplayCard",
                                label: "addressPhone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.street",
                                widget: "#DisplayCard",
                                label: "addressStreet",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.city",
                                widget: "#DisplayCard",
                                label: "addressCity",
                                widgetProps: {icon: "#IconBuilding"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.state",
                                widget: "#DisplayCard",
                                label: "addressState",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.postalCode",
                                widget: "#DisplayCard",
                                label: "addressPostalCode",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "billingAddress.country",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            field: {
                                name: "subtotal",
                                widget: "#DisplayCard",
                                label: "subtotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "discountTotal",
                                widget: "#DisplayCard",
                                label: "discountTotal",
                                widgetProps: {icon: "#IconPercent", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingTotal",
                                widget: "#DisplayCard",
                                label: "shippingTotal",
                                widgetProps: {icon: "#IconTruck", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "taxTotal",
                                widget: "#DisplayCard",
                                label: "taxTotal",
                                widgetProps: {icon: "#IconReceipt", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "grandTotal",
                                widget: "#DisplayCard",
                                label: "grandTotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
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
                            render: "#DisplayCard",
                            field: {
                                name: "shippingRate.name",
                                widget: "#DisplayCard",
                                label: "shippingRateName",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingRate.carrier",
                                widget: "#DisplayCard",
                                label: "shippingRateCarrier",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "shippingRate.price",
                                widget: "#DisplayCard",
                                label: "shippingRatePrice",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
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
                            render: "#DisplayCard",
                            field: {
                                name: "giftCard.giftCard",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            field: {
                                name: "giftCard.code",
                                widget: "#DisplayCard",
                                label: "giftCardCode",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "giftCard.amount",
                                widget: "#DisplayCard",
                                label: "giftCardAmount",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
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
                            render: "#DisplayCard",
                            field: {
                                name: "notes",
                                widget: "#DisplayCard",
                                label: "notes",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "internalNotes",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            field: {
                                name: "stripePaymentIntentId",
                                widget: "#DisplayCard",
                                label: "stripePaymentIntentId",
                                widgetProps: {icon: "#IconCreditCard"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "idempotencyKey",
                                widget: "#DisplayCard",
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
