import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const customerAddressFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "firstName", widget: "#Input", label: "form.firstNameLabel", required: true}},
            {render: "#Field", field: {name: "lastName", widget: "#Input", label: "form.lastNameLabel", required: true}},
            {render: "#Field", field: {name: "street", widget: "#Input", label: "form.streetLabel", required: true}},
            {render: "#Field", field: {name: "city", widget: "#Input", label: "form.cityLabel", required: true}},
            {render: "#Field", field: {name: "state", widget: "#Input", label: "form.stateLabel"}},
            {render: "#Field", field: {name: "postalCode", widget: "#Input", label: "form.postalCodeLabel"}},
            {render: "#Field", field: {name: "phone", widget: "#Input", label: "form.phoneLabel"}},
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
            {render: "#Field", field: {name: "label", widget: "#Input", label: "form.labelLabel"}},
            {render: "#Field", field: {name: "isDefault", widget: "#Checkbox", label: "form.isDefaultLabel"}},
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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "firstName", widget: "#SmallInfoCard", label: "firstName", widgetProps: {icon: "#IconUser"}}},
                        {render: "#SmallInfoCard", field: {name: "lastName", widget: "#SmallInfoCard", label: "lastName", widgetProps: {icon: "#IconUser"}}},
                        {render: "#SmallInfoCard", field: {name: "street", widget: "#SmallInfoCard", label: "street", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", field: {name: "city", widget: "#SmallInfoCard", label: "city", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", field: {name: "state", widget: "#SmallInfoCard", label: "state", widgetProps: {icon: "#IconMapPin"}}},
                        {render: "#SmallInfoCard", field: {name: "postalCode", widget: "#SmallInfoCard", label: "postalCode", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "phone", widget: "#SmallInfoCard", label: "phone", widgetProps: {icon: "#IconPhone"}}},
                        {render: "#SmallInfoCard", field: {name: "label", widget: "#SmallInfoCard", label: "label", widgetProps: {icon: "#IconTag"}}},
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

export const customerAddressViews: ViewConfig[] = [customerAddressSheetView, customerAddressCreateFormView, customerAddressEditFormView];
