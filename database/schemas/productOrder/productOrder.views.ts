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
                            permissions: {read: "orderNumber"},
                            field: {
                                name: "orderNumber",
                                widget: "#DisplayCard",
                                label: "orderNumber",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "productOrderStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "paymentStatus"},
                            field: {
                                name: "paymentStatus",
                                widget: "#DisplayCard",
                                label: "paymentStatus",
                                widgetProps: {icon: "#IconCreditCard", languageKeyCategory: "productOrderPaymentStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "fulfillmentStatus"},
                            field: {
                                name: "fulfillmentStatus",
                                widget: "#DisplayCard",
                                label: "fulfillmentStatus",
                                widgetProps: {icon: "#IconTruck", languageKeyCategory: "productOrderFulfillmentStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "customer"},
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
                            permissions: {read: "email"},
                            field: {
                                name: "email",
                                widget: "#DisplayCard",
                                label: "email",
                                widgetProps: {icon: "#IconMail", type: "email"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "phone"},
                            field: {
                                name: "phone",
                                widget: "#DisplayCard",
                                label: "phone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "currency"},
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
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "items",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            entityCards: true,
                                            columns: 2,
                                            compactSummaryFields: ["product", "quantity", "totalPrice"],
                                            fields: [
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "sku"],
                                                    joinSeparator: " · ",
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
                                                    icon: "#IconTag",
                                                },
                                                {
                                                    name: "snapshot.sku",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemSnapshotSku",
                                                    icon: "#Hash",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantity",
                                                    icon: "#Hash",
                                                },
                                                {
                                                    name: "unitPrice",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemUnitPrice",
                                                    currencyField: "currency",
                                                    icon: "#IconCash",
                                                },
                                                {
                                                    name: "totalPrice",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemTotalPrice",
                                                    currencyField: "currency",
                                                    icon: "#IconCash",
                                                },
                                                {
                                                    name: "currency",
                                                    type: "text",
                                                    className: "text-sm",
                                                    valuePath: ["symbol", "abbreviation"],
                                                    joinSeparator: " ",
                                                    labelKey: "currency",
                                                    icon: "#IconCash",
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
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.firstName"},
                            field: {
                                name: "shippingAddress.firstName",
                                widget: "#DisplayCard",
                                label: "addressFirstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.lastName"},
                            field: {
                                name: "shippingAddress.lastName",
                                widget: "#DisplayCard",
                                label: "addressLastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.phone"},
                            field: {
                                name: "shippingAddress.phone",
                                widget: "#DisplayCard",
                                label: "addressPhone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.street"},
                            field: {
                                name: "shippingAddress.street",
                                widget: "#DisplayCard",
                                label: "addressStreet",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.city"},
                            field: {
                                name: "shippingAddress.city",
                                widget: "#DisplayCard",
                                label: "addressCity",
                                widgetProps: {icon: "#IconBuilding"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.state"},
                            field: {
                                name: "shippingAddress.state",
                                widget: "#DisplayCard",
                                label: "addressState",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.postalCode"},
                            field: {
                                name: "shippingAddress.postalCode",
                                widget: "#DisplayCard",
                                label: "addressPostalCode",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingAddress.country"},
                            field: {
                                name: "shippingAddress.country",
                                widget: "#DisplayCard",
                                label: "addressCountry",
                                widgetProps: {
                                    icon: "#Globe",
                                    flagCodePath: "shippingAddress.country.code",
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
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.firstName"},
                            field: {
                                name: "billingAddress.firstName",
                                widget: "#DisplayCard",
                                label: "addressFirstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.lastName"},
                            field: {
                                name: "billingAddress.lastName",
                                widget: "#DisplayCard",
                                label: "addressLastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.phone"},
                            field: {
                                name: "billingAddress.phone",
                                widget: "#DisplayCard",
                                label: "addressPhone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.street"},
                            field: {
                                name: "billingAddress.street",
                                widget: "#DisplayCard",
                                label: "addressStreet",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.city"},
                            field: {
                                name: "billingAddress.city",
                                widget: "#DisplayCard",
                                label: "addressCity",
                                widgetProps: {icon: "#IconBuilding"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.state"},
                            field: {
                                name: "billingAddress.state",
                                widget: "#DisplayCard",
                                label: "addressState",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.postalCode"},
                            field: {
                                name: "billingAddress.postalCode",
                                widget: "#DisplayCard",
                                label: "addressPostalCode",
                                widgetProps: {icon: "#IconMail"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "billingAddress.country"},
                            field: {
                                name: "billingAddress.country",
                                widget: "#DisplayCard",
                                label: "addressCountry",
                                widgetProps: {
                                    icon: "#Globe",
                                    flagCodePath: "billingAddress.country.code",
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
                            permissions: {read: "subtotal"},
                            field: {
                                name: "subtotal",
                                widget: "#DisplayCard",
                                label: "subtotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "discountTotal"},
                            field: {
                                name: "discountTotal",
                                widget: "#DisplayCard",
                                label: "discountTotal",
                                widgetProps: {icon: "#IconPercent", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingTotal"},
                            field: {
                                name: "shippingTotal",
                                widget: "#DisplayCard",
                                label: "shippingTotal",
                                widgetProps: {icon: "#IconTruck", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "taxTotal"},
                            field: {
                                name: "taxTotal",
                                widget: "#DisplayCard",
                                label: "taxTotal",
                                widgetProps: {icon: "#IconReceipt", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "grandTotal"},
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
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingRate.name"},
                            field: {
                                name: "shippingRate.name",
                                widget: "#DisplayCard",
                                label: "shippingRateName",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingRate.carrier"},
                            field: {
                                name: "shippingRate.carrier",
                                widget: "#DisplayCard",
                                label: "shippingRateCarrier",
                                widgetProps: {icon: "#IconTruck"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "shippingRate.price"},
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
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "giftCard.giftCard"},
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
                            permissions: {read: "giftCard.code"},
                            field: {
                                name: "giftCard.code",
                                widget: "#DisplayCard",
                                label: "giftCardCode",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "giftCard.amount"},
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
                            permissions: {read: "notes"},
                            field: {
                                name: "notes",
                                widget: "#DisplayCard",
                                label: "notes",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "internalNotes"},
                            field: {
                                name: "internalNotes",
                                widget: "#DisplayCard",
                                label: "internalNotes",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
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
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "timeline",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 8,
                                            entityCards: true,
                                            columns: 1,
                                            compactSummaryFields: ["event", "timestamp"],
                                            fields: [
                                                {
                                                    name: "event",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    languageKeyCategory: "productOrderTimelineEvent",
                                                    icon: "#IconHistory",
                                                },
                                                {
                                                    name: "timestamp",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "dateTime",
                                                    labelKey: "timelineTimestamp",
                                                    icon: "#IconCalendar",
                                                },
                                                {
                                                    name: "user",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    valuePath: ["name", "surname"],
                                                    joinSeparator: " ",
                                                    labelKey: "timelineUser",
                                                    icon: "#IconUser",
                                                },
                                                {
                                                    name: "note",
                                                    type: "expandableText",
                                                    className: "text-sm",
                                                    labelKey: "timelineNote",
                                                    icon: "#IconAlignLeft",
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
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                            permissions: {read: "stripePaymentIntentId"},
                            field: {
                                name: "stripePaymentIntentId",
                                widget: "#DisplayCard",
                                label: "stripePaymentIntentId",
                                widgetProps: {icon: "#IconCreditCard"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "idempotencyKey"},
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
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.fulfillments.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "fulfillments",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    field: {
                                        name: "fulfillments",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#FulfillmentCard",
                                            itemDataProp: "entity",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconTruck",
                                                label: "fulfillment",
                                                valuePath: ["status", "trackingNumber", "carrier"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "fulfillments",
                                                linkedSheetWidget: "#FulfillmentSheetView",
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
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "productOrder.sheet.returnRequests.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "returnRequests",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: false,
                    },
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    field: {
                                        name: "returnRequests",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#ReturnRequestCard",
                                            itemDataProp: "entity",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconArrowBack",
                                                label: "returnRequest",
                                                valuePath: ["type", "status"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "returnRequests",
                                                linkedSheetWidget: "#ReturnRequestSheetView",
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
        lifecycleSheetGroup,
    ],
};

export const productOrderViews: ViewConfig[] = [productOrderSheetView];
