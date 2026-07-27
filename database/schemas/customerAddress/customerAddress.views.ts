import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const DEFAULT_LAT = 41.3275;
const DEFAULT_LNG = 19.8189;

const customerAddressFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {
                render: "#Field",
                field: {
                    name: "user",
                    widget: "#ApiSelect",
                    label: "form.userLabel",
                    placeholder: "form.userPlaceholder",
                    required: true,
                    widgetProps: {
                        apiUrl: "/api/company/users/select",
                        method: "POST",
                        normalizeEmptyToUndefined: true,
                    },
                },
            },
            {
                render: "#Field",
                field: {
                    name: "label",
                    widget: "#Input",
                    label: "form.labelLabel",
                    placeholder: "form.labelPlaceholder",
                },
            },
            {
                render: "#Field",
                field: {
                    name: "firstName",
                    widget: "#Input",
                    label: "form.firstNameLabel",
                    placeholder: "form.firstNamePlaceholder",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "lastName",
                    widget: "#Input",
                    label: "form.lastNameLabel",
                    placeholder: "form.lastNamePlaceholder",
                    required: true,
                },
            },
            {
                render: "#Field",
                field: {
                    name: "phone",
                    widget: "#Input",
                    label: "form.phoneLabel",
                    placeholder: "form.phonePlaceholder",
                },
            },
            {render: "#Field", field: {name: "isDefault", widget: "#Checkbox", label: "form.isDefaultLabel"}},
        ],
    },
    {
        render: "div",
        props: {className: "grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch"},
        children: [
            {
                render: "div",
                props: {className: "lg:col-span-2 space-y-4 min-w-0"},
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "country",
                                    widget: "#ApiSelect",
                                    label: "form.countryLabel",
                                    placeholder: "form.countryPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/auxiliary/country/select",
                                        method: "POST",
                                        normalizeEmptyToUndefined: true,
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "city",
                                    widget: "#Input",
                                    label: "form.cityLabel",
                                    placeholder: "form.cityPlaceholder",
                                    required: true,
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "state",
                                    widget: "#Input",
                                    label: "form.stateLabel",
                                    placeholder: "form.statePlaceholder",
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "postalCode",
                                    widget: "#Input",
                                    label: "form.postalCodeLabel",
                                    placeholder: "form.postalCodePlaceholder",
                                },
                            },
                        ],
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "street",
                            widget: "#Textarea",
                            label: "form.streetLabel",
                            placeholder: "form.streetPlaceholder",
                            required: true,
                            widgetProps: {rows: 2, className: "field-sizing-fixed max-h-32 min-h-16 overflow-y-auto"},
                        },
                    },
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "latitude",
                                    widget: "#Input",
                                    label: "form.latitudeLabel",
                                    placeholder: "form.latitudePlaceholder",
                                    required: true,
                                    widgetProps: {type: "number", step: "0.000001"},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "longitude",
                                    widget: "#Input",
                                    label: "form.longitudeLabel",
                                    placeholder: "form.longitudePlaceholder",
                                    required: true,
                                    widgetProps: {type: "number", step: "0.000001"},
                                },
                            },
                        ],
                    },
                ],
            },
            {
                render: "div",
                props: {className: "flex flex-col lg:col-span-1 w-full min-h-[220px] h-[220px] lg:h-full lg:min-h-[220px]"},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "_map",
                            widget: "#FormMapPinPicker",
                            widgetProps: {
                                fieldPrefix: "",
                                latField: "latitude",
                                lngField: "longitude",
                                defaultLat: DEFAULT_LAT,
                                defaultLng: DEFAULT_LNG,
                            },
                        },
                    },
                ],
            },
        ],
    },
];

export const customerAddressSheetView: ViewConfig = {
    model: "customerAddresses",
    viewType: "sheet",
    accessModel: "customerAddresses",
    apiUrl: "/api/eCommerce/customerAddress",
    header: {titleField: "firstName", subtitleKey: "customerAddressSubtitle", showCloseButton: true},
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
                                name: "label",
                                widget: "#SmallInfoCard",
                                label: "label",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "isDefault",
                                widget: "#SmallInfoCard",
                                label: "isDefault",
                                widgetProps: {icon: "#IconStar", valueType: "boolean"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "firstName",
                                widget: "#SmallInfoCard",
                                label: "firstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "lastName",
                                widget: "#SmallInfoCard",
                                label: "lastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "phone",
                                widget: "#SmallInfoCard",
                                label: "phone",
                                widgetProps: {icon: "#IconPhone"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "street",
                                widget: "#SmallInfoCard",
                                label: "street",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "city",
                                widget: "#SmallInfoCard",
                                label: "city",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "state",
                                widget: "#SmallInfoCard",
                                label: "state",
                                widgetProps: {icon: "#IconMapPin"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "postalCode",
                                widget: "#SmallInfoCard",
                                label: "postalCode",
                                widgetProps: {icon: "#Hash"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "latitude",
                                widget: "#SmallInfoCard",
                                label: "latitude",
                                widgetProps: {icon: "#IconMapPin", format: "locale"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "longitude",
                                widget: "#SmallInfoCard",
                                label: "longitude",
                                widgetProps: {icon: "#IconMapPin", format: "locale"},
                            },
                        },
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
                            field: {
                                name: "user",
                                widget: "#SmallInfoCard",
                                label: "user",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "user",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "country",
                                widget: "#SmallInfoCard",
                                label: "country",
                                widgetProps: {
                                    icon: "#Globe",
                                    parent: "country",
                                    valuePath: ["name", "code"],
                                    joinSeparator: " · ",
                                    linkedRefPath: "country",
                                    linkedSheetModel: "countries",
                                    linkedSheetWidget: "#CountrySheetView",
                                    linkedSheetEntityProp: "country",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
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
                    ],
                },
            ],
        },
    ],
};

export const customerAddressCreateFormView: ViewConfig = {
    model: "customerAddresses",
    viewType: "form",
    viewMode: "create",
    accessModel: "customerAddresses",
    apiUrl: "/api/eCommerce/customerAddress",
    method: "PUT",
    nodes: customerAddressFormFields,
};

export const customerAddressEditFormView: ViewConfig = {
    model: "customerAddresses",
    viewType: "form",
    viewMode: "edit",
    accessModel: "customerAddresses",
    apiUrl: "/api/eCommerce/customerAddress",
    method: "PATCH",
    nodes: customerAddressFormFields,
};

export const customerAddressViews: ViewConfig[] = [
    customerAddressSheetView,
    customerAddressCreateFormView,
    customerAddressEditFormView,
];
