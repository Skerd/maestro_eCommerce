import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const customerGroupFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {render: "#Field", field: {name: "isDefault", widget: "#Checkbox", label: "form.isDefaultLabel"}},
            {render: "#Field", field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", widgetProps: {rows: 3}}},
        ],
    },
];

export const customerGroupSheetView: ViewConfig = {
    model: "customerGroups",
    viewType: "sheet",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    header: {titleField: "name", subtitleKey: "customerGroupSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "name"}, field: {name: "name", widget: "#SmallInfoCard", label: "name", widgetProps: {icon: "#Tag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "memberCount"}, field: {name: "memberCount", widget: "#SmallInfoCard", label: "memberCount", widgetProps: {icon: "#IconUsers"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isDefault"}, field: {name: "isDefault", widget: "#SmallInfoCard", label: "isDefault", widgetProps: {icon: "#IconStar"}}},
                    ],
                },
            ],
        },
    ],
};

export const customerGroupCreateFormView: ViewConfig = {
    model: "customerGroups",
    viewType: "form",
    viewMode: "create",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    method: "PUT",
    nodes: customerGroupFormFields,
};

export const customerGroupEditFormView: ViewConfig = {
    model: "customerGroups",
    viewType: "form",
    viewMode: "edit",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    method: "PATCH",
    nodes: customerGroupFormFields,
};

export const customerGroupViews: ViewConfig[] = [customerGroupSheetView, customerGroupCreateFormView, customerGroupEditFormView];
