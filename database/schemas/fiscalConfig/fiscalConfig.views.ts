import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const environmentOptions = [
    {value: "test", label: "form.environment.test"},
    {value: "production", label: "form.environment.production"},
];

const tcrTypeOptions = [
    {value: "REGULAR", label: "form.tcrType.REGULAR"},
    {value: "VENDING", label: "form.tcrType.VENDING"},
];

const fiscalConfigFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "nipt", widget: "#Input", label: "form.niptLabel"}},
            {render: "#Field", field: {name: "softCode", widget: "#Input", label: "form.softCodeLabel", required: true}},
            {render: "#Field", field: {name: "maintainerCode", widget: "#Input", label: "form.maintainerCodeLabel"}},
            {render: "#Field", field: {name: "businessUnitCode", widget: "#Input", label: "form.businessUnitCodeLabel", required: true}},
            {render: "#Field", field: {name: "operatorCode", widget: "#Input", label: "form.operatorCodeLabel", required: true}},
            {render: "#Field", field: {name: "tcrCode", widget: "#Input", label: "form.tcrCodeLabel"}},
            {render: "#Field", field: {name: "tcrIntId", widget: "#Input", label: "form.tcrIntIdLabel"}},
            {
                render: "#Field",
                field: {
                    name: "tcrType",
                    widget: "#SimpleSelect",
                    label: "form.tcrTypeLabel",
                    widgetProps: {options: tcrTypeOptions},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "environment",
                    widget: "#SimpleSelect",
                    label: "form.environmentLabel",
                    widgetProps: {options: environmentOptions},
                },
            },
            {render: "#Field", field: {name: "fiscalizationUrl", widget: "#Input", label: "form.fiscalizationUrlLabel", required: true}},
            {render: "#Field", field: {name: "einvoiceUrl", widget: "#Input", label: "form.einvoiceUrlLabel", required: true}},
            {render: "#Field", field: {name: "selfcareUrl", widget: "#Input", label: "form.selfcareUrlLabel", required: true}},
            {render: "#Field", field: {name: "proxyUrl", widget: "#Input", label: "form.proxyUrlLabel"}},
            {render: "#Field", field: {name: "sellerName", widget: "#Input", label: "form.sellerNameLabel"}},
            {render: "#Field", field: {name: "sellerAddress", widget: "#Input", label: "form.sellerAddressLabel"}},
            {render: "#Field", field: {name: "sellerTown", widget: "#Input", label: "form.sellerTownLabel"}},
            {render: "#Field", field: {name: "sellerCountry", widget: "#Input", label: "form.sellerCountryLabel"}},
            {render: "#Field", field: {name: "certificateBase64", widget: "#Textarea", label: "form.certificateBase64Label"}},
            {
                render: "#Field",
                field: {
                    name: "certificatePassword",
                    widget: "#Input",
                    label: "form.certificatePasswordLabel",
                    widgetProps: {type: "password"},
                },
            },
            {render: "#Field", field: {name: "isVatRegistered", widget: "#Checkbox", label: "form.isVatRegisteredLabel"}},
            {render: "#Field", field: {name: "autoFiscalizePos", widget: "#Checkbox", label: "form.autoFiscalizePosLabel"}},
            {render: "#Field", field: {name: "autoEinvoice", widget: "#Checkbox", label: "form.autoEinvoiceLabel"}},
            {render: "#Field", field: {name: "clearCertificate", widget: "#Checkbox", label: "form.clearCertificateLabel"}},
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
        ],
    },
];

export const fiscalConfigSheetView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "sheet",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    header: {titleField: "name", subtitleKey: "fiscalConfigSubtitle", showCloseButton: true},
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
                        {render: "#SmallInfoCard", permissions: {read: "nipt"}, field: {name: "nipt", widget: "#SmallInfoCard", label: "nipt", widgetProps: {icon: "#IconReceipt"}}},
                        {render: "#SmallInfoCard", permissions: {read: "tcrCode"}, field: {name: "tcrCode", widget: "#SmallInfoCard", label: "tcrCode", widgetProps: {icon: "#IconBuildingStore"}}},
                        {render: "#SmallInfoCard", permissions: {read: "businessUnitCode"}, field: {name: "businessUnitCode", widget: "#SmallInfoCard", label: "businessUnitCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "softCode"}, field: {name: "softCode", widget: "#SmallInfoCard", label: "softCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "operatorCode"}, field: {name: "operatorCode", widget: "#SmallInfoCard", label: "operatorCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "environment"}, field: {name: "environment", widget: "#SmallInfoCard", label: "environment", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "hasCertificate"}, field: {name: "hasCertificate", widget: "#SmallInfoCard", label: "hasCertificate", widgetProps: {icon: "#IconCertificate"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "autoFiscalizePos"}, field: {name: "autoFiscalizePos", widget: "#SmallInfoCard", label: "autoFiscalizePos", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "autoEinvoice"}, field: {name: "autoEinvoice", widget: "#SmallInfoCard", label: "autoEinvoice", widgetProps: {icon: "#IconToggleRight"}}},
                    ],
                },
            ],
        },
    ],
};

export const fiscalConfigCreateFormView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "form",
    viewMode: "create",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    method: "PUT",
    nodes: fiscalConfigFormFields,
};

export const fiscalConfigEditFormView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "form",
    viewMode: "edit",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    method: "PATCH",
    nodes: fiscalConfigFormFields,
};

export const fiscalConfigViews: ViewConfig[] = [
    fiscalConfigSheetView,
    fiscalConfigCreateFormView,
    fiscalConfigEditFormView,
];
