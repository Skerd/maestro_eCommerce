import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    FISCAL_CONFIG_CERTIFICATE_PASSWORD_MAX,
    FISCAL_CONFIG_CIS_CODE_MAX,
    FISCAL_CONFIG_NAME_MAX,
    FISCAL_CONFIG_NIPT_MAX,
    FISCAL_CONFIG_SELLER_ADDRESS_MAX,
    FISCAL_CONFIG_SELLER_COUNTRY_MAX,
    FISCAL_CONFIG_SELLER_NAME_MAX,
    FISCAL_CONFIG_SELLER_TOWN_MAX,
    FISCAL_CONFIG_TCR_INT_ID_MAX,
    FISCAL_CONFIG_URL_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {icon: "#IconTag"}
                                }
                            },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "nipt"},
                            field: {
                                name: "nipt",
                                widget: "#DisplayCard",
                                label: "nipt",
                                widgetProps: {icon: "#IconReceipt"}
                                }
                            },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "environment"},
                            field: {
                                name: "environment",
                                widget: "#DisplayCard",
                                label: "environment",
                                widgetProps: {
                                    icon: "#IconTag",
                                    languageKeyCategory: "fiscalEnvironment",
                                    type: "enum"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "tcrType"},
                            field: {
                                name: "tcrType",
                                widget: "#DisplayCard",
                                label: "tcrType",
                                widgetProps: {
                                    icon: "#IconTag",
                                    languageKeyCategory: "fiscalTcrType",
                                    type: "enum"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "certificate"},
                            field: {
                                name: "certificate",
                                widget: "#DisplayCard",
                                label: "certificate",
                                widgetProps: {
                                    icon: "#IconCertificate",
                                    type: "media",
                                    smallMedia: true,
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isActive"},
                            field: {
                                name: "isActive",
                                widget: "#DisplayCard",
                                label: "isActive",
                                widgetProps: {
                                    icon: "#IconToggleRight",
                                    type: "boolean"
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isVatRegistered"},
                            field: {
                                name: "isVatRegistered",
                                widget: "#DisplayCard",
                                label: "isVatRegistered",
                                widgetProps: {
                                    icon: "#IconToggleRight",
                                    type: "boolean"
                                },
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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "softCode"},
                            field: {
                                name: "softCode",
                                widget: "#DisplayCard",
                                label: "softCode",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "maintainerCode"},
                            field: {
                                name: "maintainerCode",
                                widget: "#DisplayCard",
                                label: "maintainerCode",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "businessUnitCode"},
                            field: {
                                name: "businessUnitCode",
                                widget: "#DisplayCard",
                                label: "businessUnitCode",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "operatorCode"},
                            field: {
                                name: "operatorCode",
                                widget: "#DisplayCard",
                                label: "operatorCode",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "tcrCode"},
                            field: {
                                name: "tcrCode",
                                widget: "#DisplayCard",
                                label: "tcrCode",
                                widgetProps: {icon: "#IconBuildingStore"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "tcrIntId"},
                            field: {
                                name: "tcrIntId",
                                widget: "#DisplayCard",
                                label: "tcrIntId",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "fiscalizationUrl"},
                            field: {
                                name: "fiscalizationUrl",
                                widget: "#DisplayCard",
                                label: "fiscalizationUrl",
                                widgetProps: {icon: "#IconLink"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "einvoiceUrl"},
                            field: {
                                name: "einvoiceUrl",
                                widget: "#DisplayCard",
                                label: "einvoiceUrl",
                                widgetProps: {icon: "#IconLink"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "selfcareUrl"},
                            field: {
                                name: "selfcareUrl",
                                widget: "#DisplayCard",
                                label: "selfcareUrl",
                                widgetProps: {icon: "#IconLink"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "proxyUrl"},
                            field: {
                                name: "proxyUrl",
                                widget: "#DisplayCard",
                                label: "proxyUrl",
                                widgetProps: {icon: "#IconLink"}
                            }
                        },
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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "sellerName"},
                            field: {
                                name: "sellerName",
                                widget: "#DisplayCard",
                                label: "sellerName",
                                widgetProps: {icon: "#IconBuilding"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "sellerTown"},
                            field: {
                                name: "sellerTown",
                                widget: "#DisplayCard",
                                label: "sellerTown",
                                widgetProps: {icon: "#IconBuilding"}
                            }
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "sellerCountry"},
                            field: {
                                name: "sellerCountry",
                                widget: "#DisplayCard",
                                label: "sellerCountry",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
                    ],
                },
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "sellerAddress"},
                            field: {
                                name: "sellerAddress",
                                widget: "#DisplayCard",
                                label: "sellerAddress",
                                widgetProps: {icon: "#IconTag"}
                            }
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

const fiscalConfigCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        children: [
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
                            widgetProps: {maxLength: FISCAL_CONFIG_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "nipt",
                            widget: "#Input",
                            label: "form.niptLabel",
                            placeholder: "form.niptPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_NIPT_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "environment",
                            widget: "#SimpleSelect",
                            label: "form.environmentLabel",
                            placeholder: "form.environmentPlaceholder",
                            widgetProps: {
                                options: [
                                    {value: "test", label: "form.environment.test"},
                                    {value: "production", label: "form.environment.production"},
                                ]
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "tcrType",
                            widget: "#SimpleSelect",
                            label: "form.tcrTypeLabel",
                            placeholder: "form.tcrTypePlaceholder",
                            widgetProps: {
                                options: [
                                    {value: "REGULAR", label: "form.tcrType.REGULAR"},
                                    {value: "VENDING", label: "form.tcrType.VENDING"},
                                ]
                            },
                        },
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "isVatRegistered",
                            widget: "#Checkbox",
                            label: "form.isVatRegisteredLabel"
                        }
                    },
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
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "softCode",
                            widget: "#Input",
                            label: "form.softCodeLabel",
                            placeholder: "form.softCodePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "maintainerCode",
                            widget: "#Input",
                            label: "form.maintainerCodeLabel",
                            placeholder: "form.maintainerCodePlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "businessUnitCode",
                            widget: "#Input",
                            label: "form.businessUnitCodeLabel",
                            placeholder: "form.businessUnitCodePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "operatorCode",
                            widget: "#Input",
                            label: "form.operatorCodeLabel",
                            placeholder: "form.operatorCodePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "tcrCode",
                            widget: "#Input",
                            label: "form.tcrCodeLabel",
                            placeholder: "form.tcrCodePlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "tcrIntId",
                            widget: "#Input",
                            label: "form.tcrIntIdLabel",
                            placeholder: "form.tcrIntIdPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_TCR_INT_ID_MAX},
                        }
                    },
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
                    {
                        render: "#Field",
                        field: {
                            name: "fiscalizationUrl",
                            widget: "#Input",
                            label: "form.fiscalizationUrlLabel",
                            placeholder: "form.fiscalizationUrlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "einvoiceUrl",
                            widget: "#Input",
                            label: "form.einvoiceUrlLabel",
                            placeholder: "form.einvoiceUrlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "selfcareUrl",
                            widget: "#Input",
                            label: "form.selfcareUrlLabel",
                            placeholder: "form.selfcareUrlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "proxyUrl",
                            widget: "#Input",
                            label: "form.proxyUrlLabel",
                            placeholder: "form.proxyUrlPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
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
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "sellerName",
                            widget: "#Input",
                            label: "form.sellerNameLabel",
                            placeholder: "form.sellerNamePlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "sellerTown",
                            widget: "#Input",
                            label: "form.sellerTownLabel",
                            placeholder: "form.sellerTownPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_TOWN_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "sellerCountry",
                            widget: "#Input",
                            label: "form.sellerCountryLabel",
                            placeholder: "form.sellerCountryPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_COUNTRY_MAX},
                        }
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
                            name: "sellerAddress",
                            widget: "#Textarea",
                            label: "form.sellerAddressLabel",
                            placeholder: "form.sellerAddressPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_ADDRESS_MAX},
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
                            name: "certificate",
                            widget: "#MediaField",
                            label: "form.certificateLabel",
                            widgetProps: {
                                mediaType: "file",
                                mode: "multiple",
                                maxCount: 1,
                                accept: ".p12,.pfx,application/x-pkcs12,application/pkcs12",
                            },
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "certificatePassword",
                            widget: "#Input",
                            label: "form.certificatePasswordLabel",
                            placeholder: "form.certificatePasswordPlaceholder",
                            widgetProps: {type: "password", maxLength: FISCAL_CONFIG_CERTIFICATE_PASSWORD_MAX},
                        },
                    },
                ],
            },
        ],
    },
];

const fiscalConfigEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.generalSectionTitle", defaultOpen: true},
        permissions: {
            writeAny: [
                "name",
                "nipt",
                "environment",
                "tcrType",
                "isVatRegistered",
            ],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "name", write: "name"},
                        field: {
                            name: "name",
                            widget: "#Input",
                            label: "form.nameLabel",
                            placeholder: "form.namePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "nipt", write: "nipt"},
                        field: {
                            name: "nipt",
                            widget: "#Input",
                            label: "form.niptLabel",
                            placeholder: "form.niptPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_NIPT_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "environment", write: "environment"},
                        field: {
                            name: "environment",
                            widget: "#SimpleSelect",
                            label: "form.environmentLabel",
                            placeholder: "form.environmentPlaceholder",
                            widgetProps: {
                                options: [
                                    {value: "test", label: "form.environment.test"},
                                    {value: "production", label: "form.environment.production"},
                                ]
                            },
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "tcrType", write: "tcrType"},
                        field: {
                            name: "tcrType",
                            widget: "#SimpleSelect",
                            label: "form.tcrTypeLabel",
                            placeholder: "form.tcrTypePlaceholder",
                            widgetProps: {
                                options: [
                                    {value: "REGULAR", label: "form.tcrType.REGULAR"},
                                    {value: "VENDING", label: "form.tcrType.VENDING"},
                                ]
                            },
                        },
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "isVatRegistered", write: "isVatRegistered"},
                        field: {
                            name: "isVatRegistered",
                            widget: "#Checkbox",
                            label: "form.isVatRegisteredLabel"
                        }
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.cisCodesSectionTitle", defaultOpen: true},
        permissions: {
            writeAny: [
                "softCode",
                "maintainerCode",
                "businessUnitCode",
                "operatorCode",
                "tcrCode",
                "tcrIntId",
            ],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "softCode", write: "softCode"},
                        field: {
                            name: "softCode",
                            widget: "#Input",
                            label: "form.softCodeLabel",
                            placeholder: "form.softCodePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "maintainerCode", write: "maintainerCode"},
                        field: {
                            name: "maintainerCode",
                            widget: "#Input",
                            label: "form.maintainerCodeLabel",
                            placeholder: "form.maintainerCodePlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "businessUnitCode", write: "businessUnitCode"},
                        field: {
                            name: "businessUnitCode",
                            widget: "#Input",
                            label: "form.businessUnitCodeLabel",
                            placeholder: "form.businessUnitCodePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "operatorCode", write: "operatorCode"},
                        field: {
                            name: "operatorCode",
                            widget: "#Input",
                            label: "form.operatorCodeLabel",
                            placeholder: "form.operatorCodePlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "tcrCode", write: "tcrCode"},
                        field: {
                            name: "tcrCode",
                            widget: "#Input",
                            label: "form.tcrCodeLabel",
                            placeholder: "form.tcrCodePlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_CIS_CODE_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "tcrIntId", write: "tcrIntId"},
                        field: {
                            name: "tcrIntId",
                            widget: "#Input",
                            label: "form.tcrIntIdLabel",
                            placeholder: "form.tcrIntIdPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_TCR_INT_ID_MAX},
                        }
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.endpointsSectionTitle", defaultOpen: true},
        permissions: {
            writeAny: ["fiscalizationUrl", "einvoiceUrl", "selfcareUrl", "proxyUrl"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "fiscalizationUrl", write: "fiscalizationUrl"},
                        field: {
                            name: "fiscalizationUrl",
                            widget: "#Input",
                            label: "form.fiscalizationUrlLabel",
                            placeholder: "form.fiscalizationUrlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "einvoiceUrl", write: "einvoiceUrl"},
                        field: {
                            name: "einvoiceUrl",
                            widget: "#Input",
                            label: "form.einvoiceUrlLabel",
                            placeholder: "form.einvoiceUrlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "selfcareUrl", write: "selfcareUrl"},
                        field: {
                            name: "selfcareUrl",
                            widget: "#Input",
                            label: "form.selfcareUrlLabel",
                            placeholder: "form.selfcareUrlPlaceholder",
                            required: true,
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "proxyUrl", write: "proxyUrl"},
                        field: {
                            name: "proxyUrl",
                            widget: "#Input",
                            label: "form.proxyUrlLabel",
                            placeholder: "form.proxyUrlPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_URL_MAX},
                        }
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.sellerSectionTitle", defaultOpen: true},
        permissions: {
            writeAny: ["sellerName", "sellerTown", "sellerCountry", "sellerAddress"],
        },
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "sellerName", write: "sellerName"},
                        field: {
                            name: "sellerName",
                            widget: "#Input",
                            label: "form.sellerNameLabel",
                            placeholder: "form.sellerNamePlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_NAME_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "sellerTown", write: "sellerTown"},
                        field: {
                            name: "sellerTown",
                            widget: "#Input",
                            label: "form.sellerTownLabel",
                            placeholder: "form.sellerTownPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_TOWN_MAX},
                        }
                    },
                    {
                        render: "#Field",
                        permissions: {read: "sellerCountry", write: "sellerCountry"},
                        field: {
                            name: "sellerCountry",
                            widget: "#Input",
                            label: "form.sellerCountryLabel",
                            placeholder: "form.sellerCountryPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_COUNTRY_MAX},
                        }
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "sellerAddress", write: "sellerAddress"},
                        field: {
                            name: "sellerAddress",
                            widget: "#Textarea",
                            label: "form.sellerAddressLabel",
                            placeholder: "form.sellerAddressPlaceholder",
                            widgetProps: {maxLength: FISCAL_CONFIG_SELLER_ADDRESS_MAX},
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.certificateSectionTitle", defaultOpen: true},
        permissions: {writeAny: ["certificate", "certificatePassword"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "certificate", write: "certificate"},
                        field: {
                            name: "certificate",
                            widget: "#MediaField",
                            label: "form.certificateLabel",
                            widgetProps: {
                                mediaType: "file",
                                mode: "multiple",
                                maxCount: 1,
                                accept: ".p12,.pfx,application/x-pkcs12,application/pkcs12",
                            },
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "certificatePassword", write: "certificatePassword"},
                        field: {
                            name: "certificatePassword",
                            widget: "#Input",
                            label: "form.certificatePasswordLabel",
                            placeholder: "form.certificatePasswordPlaceholder",
                            widgetProps: {type: "password", maxLength: FISCAL_CONFIG_CERTIFICATE_PASSWORD_MAX},
                        },
                    },
                ],
            },
        ],
    },
];

export const fiscalConfigCreateFormView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "form",
    viewMode: "create",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    method: "PUT",
    nodes: fiscalConfigCreateFormNodes,
};

export const fiscalConfigEditFormView: ViewConfig = {
    model: "fiscalConfigs",
    viewType: "form",
    viewMode: "edit",
    accessModel: "fiscalConfigs",
    apiUrl: "/api/eCommerce/fiscalConfig",
    method: "PATCH",
    nodes: fiscalConfigEditFormNodes,
};

export const fiscalConfigViews: ViewConfig[] = [
    fiscalConfigSheetView,
    fiscalConfigCreateFormView,
    fiscalConfigEditFormView,
];
