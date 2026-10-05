import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                            render: "#DisplayCard",
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "state",
                                widget: "#DisplayCard",
                                label: "state",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "posOrderState", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "session",
                                widget: "#DisplayCard",
                                label: "session",
                                widgetProps: {
                                    icon: "#IconClock",
                                    parent: "session",
                                    valuePath: ["name"],
                                    linkedRefPath: "session",
                                    linkedSheetModel: "posSessions",
                                    linkedSheetWidget: "#PosSessionSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "config",
                                widget: "#DisplayCard",
                                label: "config",
                                widgetProps: {
                                    icon: "#IconTag",
                                    parent: "config",
                                    valuePath: ["name"],
                                    linkedRefPath: "config",
                                    linkedSheetModel: "posConfigs",
                                    linkedSheetWidget: "#PosConfigSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "cashier",
                                widget: "#DisplayCard",
                                label: "cashier",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "cashier",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
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
                                name: "customerName",
                                widget: "#DisplayCard",
                                label: "customerName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "isRefund",
                                widget: "#DisplayCard",
                                label: "isRefund",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "productOrder",
                                widget: "#DisplayCard",
                                label: "productOrder",
                                widgetProps: {
                                    icon: "#IconShoppingCart",
                                    parent: "productOrder",
                                    valuePath: ["orderNumber"],
                                    linkedRefPath: "productOrder",
                                    linkedSheetModel: "productOrders",
                                    linkedSheetWidget: "#ProductOrderSheetView",
                                    linkedSheetEntityProp: "order",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "refundOf",
                                widget: "#DisplayCard",
                                label: "refundOf",
                                widgetProps: {
                                    icon: "#IconReceipt",
                                    parent: "refundOf",
                                    valuePath: ["name"],
                                    linkedRefPath: "refundOf",
                                    linkedSheetModel: "posOrders",
                                    linkedSheetWidget: "#PosOrderSheetView",
                                    linkedSheetEntityProp: "entity",
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "lines",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            cardColumns: 3,
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
                                                    currencyField: "currency",
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
                                                    currencyField: "currency",
                                                },
                                                {
                                                    name: "priceSubtotal",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemPriceSubtotal",
                                                    currencyField: "currency",
                                                },
                                                {
                                                    name: "taxAmount",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "itemTaxAmount",
                                                    currencyField: "currency",
                                                },
                                                {
                                                    name: "priceTotal",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemPriceTotal",
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
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
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
                                                    currencyField: "currency",
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
                            render: "#DisplayCard",
                            field: {
                                name: "amountTotal",
                                widget: "#DisplayCard",
                                label: "amountTotal",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "amountTax",
                                widget: "#DisplayCard",
                                label: "amountTax",
                                widgetProps: {icon: "#IconReceipt", format: "locale", type: "locale"},
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
                                name: "orderDiscountPercent",
                                widget: "#DisplayCard",
                                label: "orderDiscountPercent",
                                widgetProps: {icon: "#IconPercent"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "amountPaid",
                                widget: "#DisplayCard",
                                label: "amountPaid",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "amountReturn",
                                widget: "#DisplayCard",
                                label: "amountReturn",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "amountRefunded",
                                widget: "#DisplayCard",
                                label: "amountRefunded",
                                widgetProps: {icon: "#IconCurrencyDollar", format: "locale", type: "locale"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "fiscalization", defaultOpen: false},
            dependentAny: ["nslf", "nivf", "fiscalInvNum", "fiscalError"],
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "nslf",
                                widget: "#DisplayCard",
                                label: "nslf",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "nivf",
                                widget: "#DisplayCard",
                                label: "nivf",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "eic",
                                widget: "#DisplayCard",
                                label: "eic",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalInvNum",
                                widget: "#DisplayCard",
                                label: "fiscalInvNum",
                                widgetProps: {icon: "#IconReceipt"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalInvOrdNum",
                                widget: "#DisplayCard",
                                label: "fiscalInvOrdNum",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalTypeOfInv",
                                widget: "#DisplayCard",
                                label: "fiscalTypeOfInv",
                                widgetProps: {icon: "#IconReceipt"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalTcrCode",
                                widget: "#DisplayCard",
                                label: "fiscalTcrCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalOperatorCode",
                                widget: "#DisplayCard",
                                label: "fiscalOperatorCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalBusinessUnitCode",
                                widget: "#DisplayCard",
                                label: "fiscalBusinessUnitCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalIssueDateTime",
                                widget: "#DisplayCard",
                                label: "fiscalIssueDateTime",
                                widgetProps: {icon: "#Calendar", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalizedAt",
                                widget: "#DisplayCard",
                                label: "fiscalizedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "einvoiceAt",
                                widget: "#DisplayCard",
                                label: "einvoiceAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "qrVerifyUrl",
                                widget: "#DisplayCard",
                                label: "qrVerifyUrl",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "fiscalError",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            field: {
                                name: "note",
                                widget: "#DisplayCard",
                                label: "note",
                                widgetProps: {icon: "#IconNote"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "clientRequestId",
                                widget: "#DisplayCard",
                                label: "clientRequestId",
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

export const posOrderViews: ViewConfig[] = [posOrderSheetView];
