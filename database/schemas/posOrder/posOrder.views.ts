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
            // Not registered with the tax authority: the thing to act on comes first (UX-03).
            render: "#SheetGroup",
            props: {title: "fiscalProblem", titleIcon: "#IconAlertTriangle", titleIconClassName: "text-red-600 dark:text-red-400", defaultOpen: true},
            dependent: "fiscalError",
            permissions: {read: "fiscalError"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "fiscalError"},
                            field: {
                                name: "fiscalError",
                                widget: "#DisplayCard",
                                label: "fiscalError",
                                widgetProps: {icon: "#IconAlertTriangle", expandable: true, maxLength: 250},
                            },
                        },
                    ],
                },
            ],
        },
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
                            permissions: {read: "session"},
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
                            permissions: {read: "config"},
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
                            permissions: {read: "cashier"},
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
                            dependent: "customer",
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
                            dependent: "productOrder",
                            permissions: {read: "productOrder"},
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
                            dependent: "refundOf",
                            permissions: {read: "refundOf"},
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
                        }
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
                            permissions: {read: "amountTotal"},
                            field: {
                                name: "amountTotal",
                                widget: "#DisplayCard",
                                label: "amountTotal",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "amountTotal"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "amountTax"},
                            field: {
                                name: "amountTax",
                                widget: "#DisplayCard",
                                label: "amountTax",
                                widgetProps: {
                                    icon: "#IconReceipt",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "amountTax"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "discountTotal",
                            permissions: {read: "discountTotal"},
                            field: {
                                name: "discountTotal",
                                widget: "#DisplayCard",
                                label: "discountTotal",
                                widgetProps: {
                                    icon: "#IconPercentage",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "discountTotal"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "orderDiscountPercent",
                            permissions: {read: "orderDiscountPercent"},
                            field: {
                                name: "orderDiscountPercent",
                                widget: "#DisplayCard",
                                label: "orderDiscountPercent",
                                widgetProps: {icon: "#IconPercentage"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "amountPaid"},
                            field: {
                                name: "amountPaid",
                                widget: "#DisplayCard",
                                label: "amountPaid",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "amountPaid"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "amountReturn",
                            permissions: {read: "amountReturn"},
                            field: {
                                name: "amountReturn",
                                widget: "#DisplayCard",
                                label: "amountReturn",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "amountReturn"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "amountRefunded",
                            permissions: {read: "amountRefunded"},
                            field: {
                                name: "amountRefunded",
                                widget: "#DisplayCard",
                                label: "amountRefunded",
                                widgetProps: {
                                    icon: "#IconCurrencyDollar",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "amountRefunded"],
                                    joinSeparator: " ",
                                    type: "currency",
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
                                            entityCards: true,
                                            columns: 2,
                                            compactSummaryFields: ["productName", "quantity", "priceTotal"],
                                            // What was sold, how many, at what price; SKU and barcode stay on the product (UX-03).
                                            fields: [
                                                {
                                                    name: "productName",
                                                    type: "text",
                                                    icon: "#IconPackage",
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
                                                    icon: "#IconCurrencyDollar",
                                                },
                                                {
                                                    name: "priceTotal",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "itemPriceTotal",
                                                    currencyField: "currency",
                                                    icon: "#IconCurrencyDollar",
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
                                            entityCards: true,
                                            columns: 3,
                                            compactSummaryFields: ["paymentMethodName", "amount"],
                                            // Method, amount and time; terminal internals stay on the terminal's own records (UX-03).
                                            fields: [
                                                {
                                                    name: "paymentMethodName",
                                                    type: "text",
                                                    icon: "#IconCreditCard",
                                                },
                                                {
                                                    name: "amount",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "paymentAmount",
                                                    currencyField: "currency",
                                                    icon: "#IconCurrencyDollar",
                                                },
                                                {
                                                    name: "paymentDate",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "dateTime",
                                                    labelKey: "paymentDate",
                                                    icon: "#IconClock",
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
            props: {title: "fiscalization", defaultOpen: false},
            dependentAny: ["nslf", "nivf", "fiscalInvNum", "fiscalResolution"],
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "nslf",
                            permissions: {read: "nslf"},
                            field: {
                                name: "nslf",
                                widget: "#DisplayCard",
                                label: "nslf",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "nivf",
                            permissions: {read: "nivf"},
                            field: {
                                name: "nivf",
                                widget: "#DisplayCard",
                                label: "nivf",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "eic",
                            permissions: {read: "eic"},
                            field: {
                                name: "eic",
                                widget: "#DisplayCard",
                                label: "eic",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalInvNum",
                            permissions: {read: "fiscalInvNum"},
                            field: {
                                name: "fiscalInvNum",
                                widget: "#DisplayCard",
                                label: "fiscalInvNum",
                                widgetProps: {icon: "#IconReceipt"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalInvOrdNum",
                            permissions: {read: "fiscalInvOrdNum"},
                            field: {
                                name: "fiscalInvOrdNum",
                                widget: "#DisplayCard",
                                label: "fiscalInvOrdNum",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalTypeOfInv",
                            permissions: {read: "fiscalTypeOfInv"},
                            field: {
                                name: "fiscalTypeOfInv",
                                widget: "#DisplayCard",
                                label: "fiscalTypeOfInv",
                                widgetProps: {icon: "#IconReceipt"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalTcrCode",
                            permissions: {read: "fiscalTcrCode"},
                            field: {
                                name: "fiscalTcrCode",
                                widget: "#DisplayCard",
                                label: "fiscalTcrCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalOperatorCode",
                            permissions: {read: "fiscalOperatorCode"},
                            field: {
                                name: "fiscalOperatorCode",
                                widget: "#DisplayCard",
                                label: "fiscalOperatorCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalBusinessUnitCode",
                            permissions: {read: "fiscalBusinessUnitCode"},
                            field: {
                                name: "fiscalBusinessUnitCode",
                                widget: "#DisplayCard",
                                label: "fiscalBusinessUnitCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalIssueDateTime",
                            permissions: {read: "fiscalIssueDateTime"},
                            field: {
                                name: "fiscalIssueDateTime",
                                widget: "#DisplayCard",
                                label: "fiscalIssueDateTime",
                                widgetProps: {icon: "#Calendar", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalizedAt",
                            permissions: {read: "fiscalizedAt"},
                            field: {
                                name: "fiscalizedAt",
                                widget: "#DisplayCard",
                                label: "fiscalizedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "einvoiceAt",
                            permissions: {read: "einvoiceAt"},
                            field: {
                                name: "einvoiceAt",
                                widget: "#DisplayCard",
                                label: "einvoiceAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "qrVerifyUrl",
                            permissions: {read: "qrVerifyUrl"},
                            field: {
                                name: "qrVerifyUrl",
                                widget: "#DisplayCard",
                                label: "qrVerifyUrl",
                                widgetProps: {icon: "#IconLink"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalResolution",
                            permissions: {read: "fiscalResolution"},
                            field: {
                                name: "fiscalResolution",
                                widget: "#DisplayCard",
                                label: "fiscalResolution",
                                widgetProps: {icon: "#IconCircleCheck", languageKeyCategory: "fiscalResolutionValues", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalResolvedBy",
                            permissions: {read: "fiscalResolvedBy"},
                            field: {
                                name: "fiscalResolvedBy",
                                widget: "#DisplayCard",
                                label: "fiscalResolvedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "fiscalResolvedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "fiscalResolvedAt",
                            permissions: {read: "fiscalResolvedAt"},
                            field: {
                                name: "fiscalResolvedAt",
                                widget: "#DisplayCard",
                                label: "fiscalResolvedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "notes", defaultOpen: true},
            dependent: "note",
            permissions: {read: "note"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            dependent: "note",
                            permissions: {read: "note"},
                            field: {
                                name: "note",
                                widget: "#DisplayCard",
                                label: "note",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
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
