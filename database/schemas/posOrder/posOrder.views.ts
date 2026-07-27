import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

// PosOrders are created by the till API — sheet-only like ProductOrder.
export const posOrderSheetView: ViewConfig = {
    model: "posOrders",
    viewType: "sheet",
    accessModel: "posOrders",
    apiUrl: "/api/eCommerce/posOrder",
    header: {titleField: "name", subtitleKey: "posOrderSubtitle", showCloseButton: true},
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
                                name: "name",
                                widget: "#SmallInfoCard",
                                label: "name",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "state",
                                widget: "#SmallInfoCard",
                                label: "state",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "posOrderState"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "session",
                                widget: "#SmallInfoCard",
                                label: "session",
                                widgetProps: {
                                    icon: "#IconClock",
                                    parent: "sessionLabel",
                                    valuePath: ["name"],
                                    linkedRefPath: "session",
                                    linkedSheetModel: "posSessions",
                                    linkedSheetWidget: "#PosSessionSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "config",
                                widget: "#SmallInfoCard",
                                label: "config",
                                widgetProps: {
                                    icon: "#IconTag",
                                    parent: "configLabel",
                                    valuePath: ["name"],
                                    linkedRefPath: "config",
                                    linkedSheetModel: "posConfigs",
                                    linkedSheetWidget: "#PosConfigSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "cashier",
                                widget: "#SmallInfoCard",
                                label: "cashier",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "cashier",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
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
                                name: "customerName",
                                widget: "#SmallInfoCard",
                                label: "customerName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "isRefund",
                                widget: "#SmallInfoCard",
                                label: "isRefund",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "productOrder",
                                widget: "#SmallInfoCard",
                                label: "productOrder",
                                widgetProps: {
                                    icon: "#IconShoppingCart",
                                    parent: "productOrderLabel",
                                    valuePath: ["orderNumber"],
                                    linkedRefPath: "productOrder",
                                    linkedSheetModel: "productOrders",
                                    linkedSheetWidget: "#ProductOrderSheetView",
                                    linkedSheetEntityProp: "order",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "refundOf",
                                widget: "#SmallInfoCard",
                                label: "refundOf",
                                widgetProps: {
                                    icon: "#IconReceipt",
                                    parent: "refundOfLabel",
                                    valuePath: ["name"],
                                    linkedRefPath: "refundOf",
                                    linkedSheetModel: "posOrders",
                                    linkedSheetWidget: "#PosOrderSheetView",
                                    linkedSheetEntityProp: "entity",
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
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "updatedAt",
                                widget: "#SmallInfoCard",
                                label: "updatedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "posOrder.sheet.lineProducts.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "products",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "lineProducts",
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    field: {
                                        name: "lineProducts",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#ProductCard",
                                            itemDataProp: "product",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconPackage",
                                                label: "product",
                                                valuePath: ["title", "sku"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "products",
                                                linkedSheetWidget: "#ProductSheetView",
                                                linkedSheetEntityProp: "product",
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
                storageKey: "posOrder.sheet.lines.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "lines",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "lines",
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "lines",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["productName", "quantity", "priceTotal"],
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
                                                    name: "productName",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemProductName",
                                                },
                                                {
                                                    name: "productSku",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemSku",
                                                },
                                                {
                                                    name: "barcode",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "itemBarcode",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantity",
                                                },
                                                {
                                                    name: "quantityRefunded",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemQuantityRefunded",
                                                },
                                                {
                                                    name: "unitPrice",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemUnitPrice",
                                                },
                                                {
                                                    name: "discountPercent",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemDiscountPercent",
                                                },
                                                {
                                                    name: "discountAmount",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemDiscountAmount",
                                                },
                                                {
                                                    name: "priceSubtotal",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemPriceSubtotal",
                                                },
                                                {
                                                    name: "taxAmount",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemTaxAmount",
                                                },
                                                {
                                                    name: "priceTotal",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemPriceTotal",
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
                storageKey: "posOrder.sheet.payments.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "payments",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "payments",
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "payments",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["paymentMethodName", "amount"],
                                            fields: [
                                                {
                                                    name: "paymentMethod",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["name"],
                                                    labelKey: "paymentMethod",
                                                    linkedSheetModel: "posPaymentMethods",
                                                    linkedSheetWidget: "#PosPaymentMethodSheetView",
                                                    linkedSheetEntityProp: "entity",
                                                    icon: "#IconCreditCard",
                                                },
                                                {
                                                    name: "paymentMethodName",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "paymentMethodName",
                                                },
                                                {
                                                    name: "paymentMethodType",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "paymentMethodType",
                                                },
                                                {
                                                    name: "amount",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "paymentAmount",
                                                },
                                                {
                                                    name: "paymentDate",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "dateTime",
                                                    labelKey: "paymentDate",
                                                },
                                                {
                                                    name: "terminalAuthCode",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "terminalAuthCode",
                                                },
                                                {
                                                    name: "terminalReference",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "terminalReference",
                                                },
                                                {
                                                    name: "terminalId",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    labelKey: "terminalId",
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
            props: {title: "totals", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "amountTotal",
                                widget: "#SmallInfoCard",
                                label: "amountTotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "amountTax",
                                widget: "#SmallInfoCard",
                                label: "amountTax",
                                widgetProps: {icon: "#IconReceipt", format: "locale"},
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
                                name: "orderDiscountPercent",
                                widget: "#SmallInfoCard",
                                label: "orderDiscountPercent",
                                widgetProps: {icon: "#IconPercent"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "amountPaid",
                                widget: "#SmallInfoCard",
                                label: "amountPaid",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "amountReturn",
                                widget: "#SmallInfoCard",
                                label: "amountReturn",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "amountRefunded",
                                widget: "#SmallInfoCard",
                                label: "amountRefunded",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "fiscalization", defaultOpen: false},
            dependent: "nslf",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "nslf",
                                widget: "#SmallInfoCard",
                                label: "nslf",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "nivf",
                                widget: "#SmallInfoCard",
                                label: "nivf",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "eic",
                                widget: "#SmallInfoCard",
                                label: "eic",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "fiscalInvNum",
                                widget: "#SmallInfoCard",
                                label: "fiscalInvNum",
                                widgetProps: {icon: "#IconReceipt"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "fiscalInvOrdNum",
                                widget: "#SmallInfoCard",
                                label: "fiscalInvOrdNum",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "fiscalIssueDateTime",
                                widget: "#SmallInfoCard",
                                label: "fiscalIssueDateTime",
                                widgetProps: {icon: "#Calendar"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "fiscalizedAt",
                                widget: "#SmallInfoCard",
                                label: "fiscalizedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "einvoiceAt",
                                widget: "#SmallInfoCard",
                                label: "einvoiceAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "qrVerifyUrl",
                                widget: "#SmallInfoCard",
                                label: "qrVerifyUrl",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "fiscalError",
                                widget: "#SmallInfoCard",
                                label: "fiscalError",
                                widgetProps: {icon: "#IconAlertTriangle"},
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
                                name: "note",
                                widget: "#SmallInfoCard",
                                label: "note",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "clientRequestId",
                                widget: "#SmallInfoCard",
                                label: "clientRequestId",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const posOrderViews: ViewConfig[] = [posOrderSheetView];
