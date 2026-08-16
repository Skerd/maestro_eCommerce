import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const posConfigFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 3},
        children: [
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "currency",
                    widget: "#ApiSelect",
                    label: "form.currencyLabel",
                    placeholder: "form.currencyPlaceholder",
                    widgetProps: {
                        apiUrl: "/api/finance/currency/select",
                        method: "GET",
                        pageSize: 50,
                        normalizeEmptyToUndefined: true,
                    },
                },
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "warehouses",
            widget: "#FormObjectIdChips",
            label: "form.warehousesLabel",
            required: true,
            widgetProps: {
                apiUrl: "/api/eCommerce/warehouse/select",
                method: "POST",
                placeholderKey: "form.selectWarehouse",
                removeTooltipKey: "form.removeWarehouse",
                selectPageSizeCreate: 50,
                selectPageSizeEdit: 200,
                labelRefFormExtraKey: "warehouses",
            },
        },
    },
    {
        render: "#Field",
        field: {
            name: "paymentMethods",
            widget: "#FormObjectIdChips",
            label: "form.paymentMethodsLabel",
            widgetProps: {
                apiUrl: "/api/eCommerce/posPaymentMethod/select",
                method: "POST",
                placeholderKey: "form.selectPaymentMethod",
                removeTooltipKey: "form.removePaymentMethod",
                selectPageSizeCreate: 50,
                selectPageSizeEdit: 200,
                labelRefFormExtraKey: "paymentMethods",
            },
        },
    },
    {
        render: "#Field",
        field: {
            name: "managers",
            widget: "#FormObjectIdChips",
            label: "form.managersLabel",
            widgetProps: {
                apiUrl: "/api/company/users/select",
                method: "POST",
                placeholderKey: "form.selectManager",
                removeTooltipKey: "form.removeManager",
                selectPageSizeCreate: 50,
                selectPageSizeEdit: 200,
                labelRefFormExtraKey: "managers",
            },
        },
    },
    {
        render: "#TitleWithCollapse",
        props: {
            title: "form.tillOptionsSectionTitle",
            defaultOpen: true,
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {render: "#Field", field: {name: "ifaceBarcodeScanner", widget: "#Switch", label: "form.ifaceBarcodeScannerLabel"}},
                    {render: "#Field", field: {name: "ifaceCashControl", widget: "#Switch", label: "form.ifaceCashControlLabel"}},
                    {render: "#Field", field: {name: "allowDiscount", widget: "#Switch", label: "form.allowDiscountLabel"}},
                    {render: "#Field", field: {name: "allowQuantityChange", widget: "#Switch", label: "form.allowQuantityChangeLabel"}},
                    {render: "#Field", field: {name: "allowOversell", widget: "#Switch", label: "form.allowOversellLabel"}},
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 3, skipRenderWhenFormExtraNotTruthy: "hasManagerPin"},
                children: [
                    {render: "#Field", field: {name: "pinForDiscount", widget: "#Switch", label: "form.pinForDiscountLabel"}},
                    {render: "#Field", field: {name: "pinForCashOut", widget: "#Switch", label: "form.pinForCashOutLabel"}},
                    {render: "#Field", field: {name: "pinForRefund", widget: "#Switch", label: "form.pinForRefundLabel"}},
                ],
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
                    name: "receiptHeader",
                    widget: "#Textarea",
                    label: "form.receiptHeaderLabel",
                    placeholder: "form.receiptHeaderPlaceholder",
                },
            },
            {
                render: "#Field",
                field: {
                    name: "receiptFooter",
                    widget: "#Textarea",
                    label: "form.receiptFooterLabel",
                    placeholder: "form.receiptFooterPlaceholder",
                },
            },
        ],
    },
];

export const posConfigSheetView: ViewConfig = {
    model: "posConfigs",
    viewType: "sheet",
    accessModel: "posConfigs",
    apiUrl: "/api/eCommerce/posConfig",
    header: {titleField: "name", subtitleKey: "posConfigSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "name"}, field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#DisplayCard", label: "isActive", widgetProps: {icon: "#IconToggleRight", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "pausedAt"}, field: {name: "isPaused", widget: "#DisplayCard", label: "isPaused", widgetProps: {icon: "#IconPlayerPause", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "pausedAt"}, dependent: "isCompanyPaused", field: {name: "isCompanyPaused", widget: "#DisplayCard", label: "isCompanyPaused", widgetProps: {icon: "#IconBuilding", type: "boolean"}}},
                        {render: "#DisplayCard", permissions: {read: "pauseReason"}, dependent: "isCompanyPaused", field: {name: "companyPauseReason", widget: "#DisplayCard", label: "companyPauseReason", widgetProps: {icon: "#IconAlertTriangle"}}},
                        {render: "#DisplayCard", permissions: {read: "pauseReason"}, field: {name: "pauseReason", widget: "#DisplayCard", label: "pauseReason", widgetProps: {icon: "#IconMessage"}}},
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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "company"},
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
                            permissions: {read: "managers"},
                            field: {
                                name: "hasManagerPin",
                                widget: "#DisplayCard",
                                label: "hasManagerPin",
                                widgetProps: {icon: "#IconLock", type: "boolean"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "posConfig.sheet.warehouses.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "warehouses",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    dependent: "warehouses",
                    permissions: {read: "warehouses"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "warehouses"},
                                    field: {
                                        name: "warehouses",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#WarehouseCard",
                                            itemDataProp: "warehouse",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconBuildingWarehouse",
                                                label: "warehouse",
                                                valuePath: ["name", "code"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "warehouses",
                                                linkedSheetWidget: "#WarehouseSheetView",
                                                linkedSheetEntityProp: "warehouse",
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
                storageKey: "posConfig.sheet.paymentMethods.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "paymentMethods",
                        titleActions: "#ReferencesViewModeToggle",
                    },
                    dependent: "paymentMethods",
                    permissions: {read: "paymentMethods"},
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    permissions: {read: "paymentMethods"},
                                    field: {
                                        name: "paymentMethods",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#PosPaymentMethodCard",
                                            itemDataProp: "entity",
                                            pageSize: 3,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconCreditCard",
                                                label: "paymentMethod",
                                                valuePath: ["name", "type"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "posPaymentMethods",
                                                linkedSheetWidget: "#PosPaymentMethodSheetView",
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
            props: {title: "managers"},
            dependent: "managers",
            permissions: {read: "managers"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "managers"},
                            field: {
                                name: "managers",
                                widget: "#DisplayCard",
                                label: "managers",
                                widgetProps: {
                                    icon: "#IconUsers",
                                    tooltip: "managers",
                                    valueType: "linkedObjectRefCardList",
                                    labelField: "name",
                                    linkedRefListLayout: "responsive4",
                                    linkedRefListPath: "managers",
                                    linkedSheetModel: "posConfigs",
                                    linkedSheetWidget: "#PosManagerSheetView",
                                    linkedSheetEntityProp: "manager",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "tillOptions"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "ifaceBarcodeScanner"}, field: {name: "ifaceBarcodeScanner", widget: "#DisplayCard", label: "ifaceBarcodeScanner", widgetProps: {icon: "#IconBarcode"}}},
                        {render: "#DisplayCard", permissions: {read: "ifaceCashControl"}, field: {name: "ifaceCashControl", widget: "#DisplayCard", label: "ifaceCashControl", widgetProps: {icon: "#IconCash"}}},
                        {render: "#DisplayCard", permissions: {read: "allowDiscount"}, field: {name: "allowDiscount", widget: "#DisplayCard", label: "allowDiscount", widgetProps: {icon: "#IconPercentage"}}},
                        {render: "#DisplayCard", permissions: {read: "allowQuantityChange"}, field: {name: "allowQuantityChange", widget: "#DisplayCard", label: "allowQuantityChange", widgetProps: {icon: "#Hash"}}},
                        {render: "#DisplayCard", permissions: {read: "allowOversell"}, field: {name: "allowOversell", widget: "#DisplayCard", label: "allowOversell", widgetProps: {icon: "#IconPackageOff"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "pinRequirements"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "pinForDiscount"}, field: {name: "pinForDiscount", widget: "#DisplayCard", label: "pinForDiscount", widgetProps: {icon: "#IconLock"}}},
                        {render: "#DisplayCard", permissions: {read: "pinForCashOut"}, field: {name: "pinForCashOut", widget: "#DisplayCard", label: "pinForCashOut", widgetProps: {icon: "#IconCashBanknote"}}},
                        {render: "#DisplayCard", permissions: {read: "pinForRefund"}, field: {name: "pinForRefund", widget: "#DisplayCard", label: "pinForRefund", widgetProps: {icon: "#IconReceiptRefund"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "receipt"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "receiptHeader"}, field: {name: "receiptHeader", widget: "#DisplayCard", label: "receiptHeader", widgetProps: {icon: "#IconReceipt"}}},
                        {render: "#DisplayCard", permissions: {read: "receiptFooter"}, field: {name: "receiptFooter", widget: "#DisplayCard", label: "receiptFooter", widgetProps: {icon: "#IconReceipt"}}},
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const posConfigCreateFormView: ViewConfig = {
    model: "posConfigs",
    viewType: "form",
    viewMode: "create",
    accessModel: "posConfigs",
    apiUrl: "/api/eCommerce/posConfig",
    method: "PUT",
    nodes: posConfigFormFields,
};

export const posConfigEditFormView: ViewConfig = {
    model: "posConfigs",
    viewType: "form",
    viewMode: "edit",
    accessModel: "posConfigs",
    apiUrl: "/api/eCommerce/posConfig",
    method: "PATCH",
    nodes: posConfigFormFields,
};

export const posConfigViews: ViewConfig[] = [posConfigSheetView, posConfigCreateFormView, posConfigEditFormView];
