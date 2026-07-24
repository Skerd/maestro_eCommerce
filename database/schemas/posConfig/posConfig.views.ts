import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const posConfigFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {
                render: "#Field",
                field: {
                    name: "warehouse",
                    widget: "#ApiSelect",
                    label: "form.warehouseLabel",
                    placeholder: "form.warehousePlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/eCommerce/warehouse/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                    },
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
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
            {render: "#Field", field: {name: "ifaceBarcodeScanner", widget: "#Checkbox", label: "form.ifaceBarcodeScannerLabel"}},
            {render: "#Field", field: {name: "ifaceCashControl", widget: "#Checkbox", label: "form.ifaceCashControlLabel"}},
            {render: "#Field", field: {name: "allowDiscount", widget: "#Checkbox", label: "form.allowDiscountLabel"}},
            {render: "#Field", field: {name: "allowQuantityChange", widget: "#Checkbox", label: "form.allowQuantityChangeLabel"}},
        ],
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
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {render: "#Field", field: {name: "receiptHeader", widget: "#Textarea", label: "form.receiptHeaderLabel"}},
            {render: "#Field", field: {name: "receiptFooter", widget: "#Textarea", label: "form.receiptFooterLabel"}},
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
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "ifaceBarcodeScanner"}, field: {name: "ifaceBarcodeScanner", widget: "#SmallInfoCard", label: "ifaceBarcodeScanner", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "ifaceCashControl"}, field: {name: "ifaceCashControl", widget: "#SmallInfoCard", label: "ifaceCashControl", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "allowDiscount"}, field: {name: "allowDiscount", widget: "#SmallInfoCard", label: "allowDiscount", widgetProps: {icon: "#IconPercent"}}},
                        {render: "#SmallInfoCard", permissions: {read: "allowQuantityChange"}, field: {name: "allowQuantityChange", widget: "#SmallInfoCard", label: "allowQuantityChange", widgetProps: {icon: "#Hash"}}},
                    ],
                },
            ],
        },
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
