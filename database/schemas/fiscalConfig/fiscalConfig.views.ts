import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const environmentOptions = [
    {value: "test", label: "form.environment.test"},
    {value: "production", label: "form.environment.production"},
];

const tcrTypeOptions = [
    {value: "REGULAR", label: "form.tcrType.REGULAR"},
    {value: "VENDING", label: "form.tcrType.VENDING"},
];

const largeTextClassName = "field-sizing-fixed max-h-56 min-h-24 overflow-y-auto";

const fiscalConfigSharedFormFields: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
                    {render: "#Field", field: {name: "nipt", widget: "#Input", label: "form.niptLabel"}},
                    {
                        render: "#Field",
                        field: {
                            name: "environment",
                            widget: "#SimpleSelect",
                            label: "form.environmentLabel",
                            widgetProps: {options: environmentOptions},
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "tcrType",
                            widget: "#SimpleSelect",
                            label: "form.tcrTypeLabel",
                            widgetProps: {options: tcrTypeOptions},
                        },
                    },
                    {render: "#Field", field: {name: "isVatRegistered", widget: "#Checkbox", label: "form.isVatRegisteredLabel"}},
                    {render: "#Field", field: {name: "autoFiscalizePos", widget: "#Checkbox", label: "form.autoFiscalizePosLabel"}},
                    {render: "#Field", field: {name: "autoEinvoice", widget: "#Checkbox", label: "form.autoEinvoiceLabel"}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.cisCodesSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "softCode", widget: "#Input", label: "form.softCodeLabel", required: true}},
                    {render: "#Field", field: {name: "maintainerCode", widget: "#Input", label: "form.maintainerCodeLabel"}},
                    {render: "#Field", field: {name: "businessUnitCode", widget: "#Input", label: "form.businessUnitCodeLabel", required: true}},
                    {render: "#Field", field: {name: "operatorCode", widget: "#Input", label: "form.operatorCodeLabel", required: true}},
                    {render: "#Field", field: {name: "tcrCode", widget: "#Input", label: "form.tcrCodeLabel"}},
                    {render: "#Field", field: {name: "tcrIntId", widget: "#Input", label: "form.tcrIntIdLabel"}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.endpointsSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "fiscalizationUrl", widget: "#Input", label: "form.fiscalizationUrlLabel", required: true}},
                    {render: "#Field", field: {name: "einvoiceUrl", widget: "#Input", label: "form.einvoiceUrlLabel", required: true}},
                    {render: "#Field", field: {name: "selfcareUrl", widget: "#Input", label: "form.selfcareUrlLabel", required: true}},
                    {render: "#Field", field: {name: "proxyUrl", widget: "#Input", label: "form.proxyUrlLabel"}},
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.sellerSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "sellerName", widget: "#Input", label: "form.sellerNameLabel"}},
                    {render: "#Field", field: {name: "sellerTown", widget: "#Input", label: "form.sellerTownLabel"}},
                    {render: "#Field", field: {name: "sellerCountry", widget: "#Input", label: "form.sellerCountryLabel"}},
                    {
                        render: "#Field",
                        field: {
                            name: "sellerAddress",
                            widget: "#Textarea",
                            label: "form.sellerAddressLabel",
                            widgetProps: {className: largeTextClassName},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.certificateSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "certificateBase64",
                            widget: "#Textarea",
                            label: "form.certificateBase64Label",
                            widgetProps: {
                                className: `${largeTextClassName} font-mono text-xs`,
                                rows: 6,
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "certificatePassword",
                            widget: "#Input",
                            label: "form.certificatePasswordLabel",
                            widgetProps: {type: "password"},
                        },
                    },
                ],
            },
        ],
    },
];

const fiscalConfigCreateFormFields: ViewConfig["nodes"] = fiscalConfigSharedFormFields;

const fiscalConfigEditFormFields: ViewConfig["nodes"] = [
    ...fiscalConfigSharedFormFields,
    {
        render: "#TitleWithCollapse",
        props: {title: "form.certificateManageSectionTitle", defaultOpen: false},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "clearCertificate", widget: "#Checkbox", label: "form.clearCertificateLabel"}},
                ],
            },
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
            props: {title: "overview", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "name"}, field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "nipt"}, field: {name: "nipt", widget: "#DisplayCard", label: "nipt", widgetProps: {icon: "#IconReceipt"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "environment"},
                            field: {
                                name: "environment",
                                widget: "#DisplayCard",
                                label: "environment",
                                widgetProps: {icon: "#IconTag", languageKeyCategory: "fiscalEnvironment", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "tcrType"},
                            field: {
                                name: "tcrType",
                                widget: "#DisplayCard",
                                label: "tcrType",
                                widgetProps: {icon: "#IconTag", languageKeyCategory: "fiscalTcrType", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "hasCertificate"},
                            field: {
                                name: "hasCertificate",
                                widget: "#DisplayCard",
                                label: "hasCertificate",
                                widgetProps: {icon: "#IconCertificate", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#DisplayCard",
                                label: "isActive",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isVatRegistered"},
                            field: {
                                name: "isVatRegistered",
                                widget: "#DisplayCard",
                                label: "isVatRegistered",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "autoFiscalizePos"},
                            field: {
                                name: "autoFiscalizePos",
                                widget: "#DisplayCard",
                                label: "autoFiscalizePos",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "autoEinvoice"},
                            field: {
                                name: "autoEinvoice",
                                widget: "#DisplayCard",
                                label: "autoEinvoice",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "cisCodes", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "softCode"}, field: {name: "softCode", widget: "#DisplayCard", label: "softCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "maintainerCode"}, field: {name: "maintainerCode", widget: "#DisplayCard", label: "maintainerCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "businessUnitCode"}, field: {name: "businessUnitCode", widget: "#DisplayCard", label: "businessUnitCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "operatorCode"}, field: {name: "operatorCode", widget: "#DisplayCard", label: "operatorCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "tcrCode"}, field: {name: "tcrCode", widget: "#DisplayCard", label: "tcrCode", widgetProps: {icon: "#IconBuildingStore"}}},
                        {render: "#DisplayCard", permissions: {read: "tcrIntId"}, field: {name: "tcrIntId", widget: "#DisplayCard", label: "tcrIntId", widgetProps: {icon: "#IconTag"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "endpoints", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "fiscalizationUrl"}, field: {name: "fiscalizationUrl", widget: "#DisplayCard", label: "fiscalizationUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#DisplayCard", permissions: {read: "einvoiceUrl"}, field: {name: "einvoiceUrl", widget: "#DisplayCard", label: "einvoiceUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#DisplayCard", permissions: {read: "selfcareUrl"}, field: {name: "selfcareUrl", widget: "#DisplayCard", label: "selfcareUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#DisplayCard", permissions: {read: "proxyUrl"}, field: {name: "proxyUrl", widget: "#DisplayCard", label: "proxyUrl", widgetProps: {icon: "#IconLink"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "seller", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "sellerName"}, field: {name: "sellerName", widget: "#DisplayCard", label: "sellerName", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#DisplayCard", permissions: {read: "sellerTown"}, field: {name: "sellerTown", widget: "#DisplayCard", label: "sellerTown", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#DisplayCard", permissions: {read: "sellerCountry"}, field: {name: "sellerCountry", widget: "#DisplayCard", label: "sellerCountry", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "sellerAddress"}, field: {name: "sellerAddress", widget: "#DisplayCard", label: "sellerAddress", widgetProps: {icon: "#IconTag"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "related", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
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
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const fiscalConfigCreateFormView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "form",
    viewMode: "create",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    method: "PUT",
    nodes: fiscalConfigCreateFormFields,
};

export const fiscalConfigEditFormView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "form",
    viewMode: "edit",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    method: "PATCH",
    nodes: fiscalConfigEditFormFields,
};

export const fiscalConfigViews: ViewConfig[] = [
    fiscalConfigSheetView,
    fiscalConfigCreateFormView,
    fiscalConfigEditFormView,
];
