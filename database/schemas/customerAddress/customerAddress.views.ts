import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                    name: "customer",
                    widget: "#ApiSelect",
                    label: "form.customerLabel",
                    placeholder: "form.customerPlaceholder",
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
        ],
    },
    {
        render: "div",
        props: {className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"},
        children: [
            {
                render: "div",
                props: {className: "lg:col-span-2 space-y-6 min-w-0"},
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2, className: "gap-6"},
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
                                        pageSize: 50,
                                        normalizeEmptyToUndefined: true,
                                        cascadeClearFormFields: ["state", "city"],
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "state",
                                    widget: "#ApiSelect",
                                    label: "form.stateLabel",
                                    placeholder: "form.statePlaceholder",
                                    widgetProps: {
                                        apiUrl: "/api/auxiliary/state/select",
                                        method: "POST",
                                        pageSize: 50,
                                        normalizeEmptyToUndefined: true,
                                        postBodyFromFormFields: [{field: "country", paramName: "country"}],
                                        enableWhenFormFieldsNonEmpty: ["country"],
                                        cascadeClearFormFields: ["city"],
                                    },
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "city",
                                    widget: "#ApiSelect",
                                    label: "form.cityLabel",
                                    placeholder: "form.cityPlaceholder",
                                    required: true,
                                    widgetProps: {
                                        apiUrl: "/api/auxiliary/city/select",
                                        method: "POST",
                                        pageSize: 50,
                                        normalizeEmptyToUndefined: true,
                                        postBodyFromFormFields: [
                                            {field: "country", paramName: "country"},
                                            {field: "state", paramName: "state"},
                                        ],
                                        enableWhenFormFieldsNonEmpty: ["country"],
                                    },
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
                        props: {columns: 2, className: "gap-6"},
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
                            render: "#DisplayCard",
                            field: {
                                name: "label",
                                widget: "#DisplayCard",
                                label: "label",
                                widgetProps: {icon: "#IconTag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "isDefault",
                                widget: "#DisplayCard",
                                label: "isDefault",
                                widgetProps: {icon: "#IconStar", valueType: "boolean", type: "boolean"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "firstName",
                                widget: "#DisplayCard",
                                label: "firstName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "lastName",
                                widget: "#DisplayCard",
                                label: "lastName",
                                widgetProps: {icon: "#IconUser"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            field: {
                                name: "phone",
                                widget: "#DisplayCard",
                                label: "phone",
                                widgetProps: {icon: "#IconPhone", type: "phoneNumber"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "address", defaultOpen: true},
            children: [
                {
                    render: "div",
                    props: {className: "grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch"},
                    children: [
                        {
                            render: "div",
                            props: {className: "lg:col-span-2 space-y-2 min-w-0"},
                            children: [
                                {
                                    render: "#SheetGrid",
                                    props: {columns: 2},
                                    children: [
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "country",
                                                widget: "#DisplayCard",
                                                label: "country",
                                                widgetProps: {
                                                    icon: "#Globe",
                                                    parent: "country",
                                                    valuePath: ["name"],
                                                    linkedRefPath: "country",
                                                    linkedSheetModel: "countries",
                                                    linkedSheetWidget: "#CountrySheetView",
                                                    linkedSheetEntityProp: "country",
                                                },
                                            },
                                        },
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "state",
                                                widget: "#DisplayCard",
                                                label: "state",
                                                widgetProps: {
                                                    icon: "#IconMapPin",
                                                    parent: "state",
                                                    valuePath: ["name"],
                                                    linkedRefPath: "state",
                                                    linkedSheetModel: "states",
                                                    linkedSheetWidget: "#StateSheetView",
                                                    linkedSheetEntityProp: "state",
                                                },
                                            },
                                        },
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "city",
                                                widget: "#DisplayCard",
                                                label: "city",
                                                widgetProps: {
                                                    icon: "#IconMapPin",
                                                    parent: "city",
                                                    valuePath: ["name"],
                                                    linkedRefPath: "city",
                                                    linkedSheetModel: "cities",
                                                    linkedSheetWidget: "#CitySheetView",
                                                    linkedSheetEntityProp: "city",
                                                },
                                            },
                                        },
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "postalCode",
                                                widget: "#DisplayCard",
                                                label: "postalCode",
                                                widgetProps: {icon: "#Hash"},
                                            },
                                        },
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "street",
                                                widget: "#DisplayCard",
                                                label: "street",
                                                widgetProps: {icon: "#IconMapPin"},
                                            },
                                        },
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "latitude",
                                                widget: "#DisplayCard",
                                                label: "latitude",
                                                widgetProps: {icon: "#IconMapPin", format: "locale"},
                                            },
                                        },
                                        {
                                            render: "#DisplayCard",
                                            field: {
                                                name: "longitude",
                                                widget: "#DisplayCard",
                                                label: "longitude",
                                                widgetProps: {icon: "#IconMapPin", format: "locale"},
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            render: "div",
                            props: {
                                className:
                                    "flex flex-col lg:col-span-1 w-full min-h-[180px] h-[180px] lg:h-full lg:min-h-[180px]",
                            },
                            children: [
                                {
                                    render: "#SheetLocationMap",
                                    field: {
                                        name: "latitude",
                                        widget: "#SheetLocationMap",
                                        widgetProps: {addressField: "."},
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
            props: {title: "related", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
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
