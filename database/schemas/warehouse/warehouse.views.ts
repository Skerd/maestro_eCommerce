import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const warehouseFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "code", widget: "#Input", label: "form.codeLabel", required: true}},
            {render: "#Field", field: {name: "isDefault", widget: "#Checkbox", label: "form.isDefaultLabel"}},
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.addressSectionTitle"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
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
                props: {columns: 2},
                children: [
                    {render: "#Field", field: {name: "address.street", widget: "#Input", label: "form.streetLabel", placeholder: "form.streetPlaceholder"}},
                    {render: "#Field", field: {name: "address.postalCode", widget: "#Input", label: "form.postalCodeLabel", placeholder: "form.postalCodePlaceholder"}},
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
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#IconBuildingWarehouse"}}},
                        {render: "#SmallInfoCard", permissions: {read: "code"}, field: {name: "code", widget: "#SmallInfoCard", label: "code", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isDefault"}, field: {name: "isDefault", widget: "#SmallInfoCard", label: "isDefault", widgetProps: {icon: "#IconStar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "address"}, field: {name: "address.street", widget: "#SmallInfoCard", label: "street", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", permissions: {read: "address"}, field: {name: "address.postalCode", widget: "#SmallInfoCard", label: "postalCode", widgetProps: {icon: "#IconMail"}}},
                    ],
                },
            ],
        },
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
