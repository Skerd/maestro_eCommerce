import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

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
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "nipt"}, field: {name: "nipt", widget: "#SmallInfoCard", label: "nipt", widgetProps: {icon: "#IconReceipt"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "environment"},
                            field: {
                                name: "environment",
                                widget: "#SmallInfoCard",
                                label: "environment",
                                widgetProps: {icon: "#IconTag", languageKeyCategory: "fiscalEnvironment"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "tcrType"},
                            field: {
                                name: "tcrType",
                                widget: "#SmallInfoCard",
                                label: "tcrType",
                                widgetProps: {icon: "#IconTag", languageKeyCategory: "fiscalTcrType"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "hasCertificate"},
                            field: {
                                name: "hasCertificate",
                                widget: "#SmallInfoCard",
                                label: "hasCertificate",
                                widgetProps: {icon: "#IconCertificate", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#SmallInfoCard",
                                label: "isActive",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "isVatRegistered"},
                            field: {
                                name: "isVatRegistered",
                                widget: "#SmallInfoCard",
                                label: "isVatRegistered",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "autoFiscalizePos"},
                            field: {
                                name: "autoFiscalizePos",
                                widget: "#SmallInfoCard",
                                label: "autoFiscalizePos",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "autoEinvoice"},
                            field: {
                                name: "autoEinvoice",
                                widget: "#SmallInfoCard",
                                label: "autoEinvoice",
                                widgetProps: {icon: "#IconToggleRight", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdAt"},
                            field: {
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "updatedAt"},
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
            render: "#SheetGroup",
            props: {title: "cisCodes", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "softCode"}, field: {name: "softCode", widget: "#SmallInfoCard", label: "softCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "maintainerCode"}, field: {name: "maintainerCode", widget: "#SmallInfoCard", label: "maintainerCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "businessUnitCode"}, field: {name: "businessUnitCode", widget: "#SmallInfoCard", label: "businessUnitCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "operatorCode"}, field: {name: "operatorCode", widget: "#SmallInfoCard", label: "operatorCode", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "tcrCode"}, field: {name: "tcrCode", widget: "#SmallInfoCard", label: "tcrCode", widgetProps: {icon: "#IconBuildingStore"}}},
                        {render: "#SmallInfoCard", permissions: {read: "tcrIntId"}, field: {name: "tcrIntId", widget: "#SmallInfoCard", label: "tcrIntId", widgetProps: {icon: "#IconTag"}}},
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
                        {render: "#SmallInfoCard", permissions: {read: "fiscalizationUrl"}, field: {name: "fiscalizationUrl", widget: "#SmallInfoCard", label: "fiscalizationUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", permissions: {read: "einvoiceUrl"}, field: {name: "einvoiceUrl", widget: "#SmallInfoCard", label: "einvoiceUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", permissions: {read: "selfcareUrl"}, field: {name: "selfcareUrl", widget: "#SmallInfoCard", label: "selfcareUrl", widgetProps: {icon: "#IconLink"}}},
                        {render: "#SmallInfoCard", permissions: {read: "proxyUrl"}, field: {name: "proxyUrl", widget: "#SmallInfoCard", label: "proxyUrl", widgetProps: {icon: "#IconLink"}}},
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
                        {render: "#SmallInfoCard", permissions: {read: "sellerName"}, field: {name: "sellerName", widget: "#SmallInfoCard", label: "sellerName", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#SmallInfoCard", permissions: {read: "sellerTown"}, field: {name: "sellerTown", widget: "#SmallInfoCard", label: "sellerTown", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#SmallInfoCard", permissions: {read: "sellerCountry"}, field: {name: "sellerCountry", widget: "#SmallInfoCard", label: "sellerCountry", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "sellerAddress"}, field: {name: "sellerAddress", widget: "#SmallInfoCard", label: "sellerAddress", widgetProps: {icon: "#IconTag"}}},
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
                            render: "#SmallInfoCard",
                            permissions: {read: "company"},
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
                            permissions: {read: "createdBy"},
                            field: {
                                name: "createdBy",
                                widget: "#SmallInfoCard",
                                label: "createdBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "createdBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "deletion", defaultOpen: false},
            dependent: "deletedAt",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "deletedAt"},
                            field: {
                                name: "deletedAt",
                                widget: "#SmallInfoCard",
                                label: "deletedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "deletedBy"},
                            field: {
                                name: "deletedBy",
                                widget: "#SmallInfoCard",
                                label: "deletedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "deletedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
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
