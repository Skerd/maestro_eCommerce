import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const customerAddressSheetView: ViewConfig = {
    model: "customerAddresses",
    viewType: "sheet",
    accessModel: "customerAddresses",
    apiUrl: "/api/eCommerce/customerAddress",
    header: {titleField: "firstName", subtitleKey: "customerAddressSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "street", widget: "#SmallInfoCard", label: "street", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", field: {name: "city", widget: "#SmallInfoCard", label: "city", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", field: {name: "isDefault", widget: "#SmallInfoCard", label: "isDefault", widgetProps: {icon: "#IconStar"}}},
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
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 2},
            children: [
                {render: "#Field", field: {name: "firstName", widget: "#Input", label: "form.firstNameLabel", required: true}},
                {render: "#Field", field: {name: "lastName", widget: "#Input", label: "form.lastNameLabel", required: true}},
                {render: "#Field", field: {name: "street", widget: "#Input", label: "form.streetLabel", required: true}},
                {render: "#Field", field: {name: "city", widget: "#Input", label: "form.cityLabel", required: true}},
                {render: "#Field", field: {name: "country", widget: "#Select", label: "form.countryLabel", required: true}},
            ],
        },
    ],
};

export const customerAddressEditFormView: ViewConfig = {
    model: "customerAddresses",
    viewType: "form",
    viewMode: "edit",
    accessModel: "customerAddresses",
    apiUrl: "/api/eCommerce/customerAddress",
    method: "PATCH",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 2},
            children: [
                {render: "#Field", field: {name: "firstName", widget: "#Input", label: "form.firstNameLabel", required: true}},
                {render: "#Field", field: {name: "lastName", widget: "#Input", label: "form.lastNameLabel", required: true}},
                {render: "#Field", field: {name: "street", widget: "#Input", label: "form.streetLabel", required: true}},
                {render: "#Field", field: {name: "city", widget: "#Input", label: "form.cityLabel", required: true}},
                {render: "#Field", field: {name: "isDefault", widget: "#Checkbox", label: "form.isDefaultLabel"}},
            ],
        },
    ],
};

export const customerAddressViews: ViewConfig[] = [customerAddressSheetView, customerAddressCreateFormView, customerAddressEditFormView];
