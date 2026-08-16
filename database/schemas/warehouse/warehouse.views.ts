import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const warehouseFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", placeholder: "form.namePlaceholder", required: true}},
            {render: "#Field", field: {name: "code", widget: "#Input", label: "form.codeLabel", placeholder: "form.codePlaceholder", required: true}},
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.addressSectionTitle"},
        children: [
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
                                props: {columns: 3, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.country",
                                            widget: "#ApiSelect",
                                            label: "form.countryLabel",
                                            placeholder: "form.countryPlaceholder",
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/country/select",
                                                method: "POST",
                                                pageSize: 50,
                                                cascadeClearFormFields: ["address.state", "address.city"],
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.state",
                                            widget: "#ApiSelect",
                                            label: "form.stateLabel",
                                            placeholder: "form.statePlaceholder",
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/state/select",
                                                method: "POST",
                                                pageSize: 50,
                                                postBodyFromFormFields: [{field: "address.country", paramName: "country"}],
                                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                                cascadeClearFormFields: ["address.city"],
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.city",
                                            widget: "#ApiSelect",
                                            label: "form.cityLabel",
                                            placeholder: "form.cityPlaceholder",
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/city/select",
                                                method: "POST",
                                                pageSize: 50,
                                                postBodyFromFormFields: [
                                                    {field: "address.country", paramName: "country"},
                                                    {field: "address.state", paramName: "state"},
                                                ],
                                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                            },
                                        },
                                    },
                                ],
                            },
                            {
                                render: "#FormGrid",
                                props: {columns: 2, className: "gap-6"},
                                children: [
                                    {render: "#Field", field: {name: "address.street", widget: "#Input", label: "form.streetLabel", placeholder: "form.streetPlaceholder"}},
                                    {render: "#Field", field: {name: "address.postalCode", widget: "#Input", label: "form.postalCodeLabel", placeholder: "form.postalCodePlaceholder"}},
                                ],
                            },
                            {
                                render: "#FormGrid",
                                props: {columns: 2, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.latitude",
                                            widget: "#Input",
                                            label: "form.latitudeLabel",
                                            placeholder: "form.latitudePlaceholder",
                                            widgetProps: {type: "number", step: "0.000001"},
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.longitude",
                                            widget: "#Input",
                                            label: "form.longitudeLabel",
                                            placeholder: "form.longitudePlaceholder",
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
                                        fieldPrefix: "address",
                                        latField: "latitude",
                                        lngField: "longitude",
                                        defaultLat: 41.3275,
                                        defaultLng: 19.8189,
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

export const warehouseSheetView: ViewConfig = {
    model: "warehouses",
    viewType: "sheet",
    accessModel: "warehouses",
    apiUrl: "/api/eCommerce/warehouse",
    header: {titleField: "name", subtitleKey: "warehouseSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "name"}, field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#IconBuildingWarehouse"}}},
                        {render: "#DisplayCard", permissions: {read: "code"}, field: {name: "code", widget: "#DisplayCard", label: "code", widgetProps: {icon: "#Hash"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "isDefault"},
                            field: {
                                name: "isDefault",
                                widget: "#DisplayCard",
                                label: "isDefault",
                                widgetProps: {icon: "#IconStar", type: "boolean"},
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
                            permissions: {read: "company"},
                            field: {
                                name: "company",
                                widget: "#DisplayCard",
                                label: "company",
                                widgetProps: {icon: "#Building", parent: "company", valuePath: ["name"]},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "address"},
            permissions: {read: "address"},
            dependent: "address",
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.country.name", widget: "#DisplayCard", label: "country", widgetProps: {icon: "#Globe"}}},
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.state.name", widget: "#DisplayCard", label: "state", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.city.name", widget: "#DisplayCard", label: "city", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.street", widget: "#DisplayCard", label: "street", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.postalCode", widget: "#DisplayCard", label: "postalCode", widgetProps: {icon: "#IconMail"}}},
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.latitude", widget: "#DisplayCard", label: "latitude", widgetProps: {icon: "#IconMapPin", format: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "address"}, field: {name: "address.longitude", widget: "#DisplayCard", label: "longitude", widgetProps: {icon: "#IconMapPin", format: "locale"}}},
                    ],
                },
                {
                    render: "div",
                    props: {className: "w-full pt-2 min-h-[150px]"},
                    children: [
                        {
                            render: "#SheetLocationMap",
                            permissions: {read: "address"},
                            field: {
                                name: "address",
                                widget: "#SheetLocationMap",
                                widgetProps: {addressField: "address"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const warehouseCreateFormView: ViewConfig = {
    model: "warehouses",
    viewType: "form",
    viewMode: "create",
    accessModel: "warehouses",
    apiUrl: "/api/eCommerce/warehouse",
    method: "PUT",
    nodes: warehouseFormFields,
};

export const warehouseEditFormView: ViewConfig = {
    model: "warehouses",
    viewType: "form",
    viewMode: "edit",
    accessModel: "warehouses",
    apiUrl: "/api/eCommerce/warehouse",
    method: "PATCH",
    nodes: warehouseFormFields,
};

export const warehouseViews: ViewConfig[] = [warehouseSheetView, warehouseCreateFormView, warehouseEditFormView];
