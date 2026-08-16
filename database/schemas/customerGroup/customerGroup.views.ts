import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const customerGroupFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", placeholder: "form.namePlaceholder", required: true}},
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {className: "resize-none max-h-[200px] overflow-y-auto"},
                },
            },
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
                    props: {columns: 1},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "name"}, field: {name: "name", widget: "#DisplayCard", label: "name", widgetProps: {icon: "#Tag"}}},
                        {render: "#DisplayCard", permissions: {read: "memberCount"}, field: {name: "memberCount", widget: "#DisplayCard", label: "memberCount", widgetProps: {icon: "#IconUsers", type: "number"}}},
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
                            permissions: {read: "company"},
                            field: {
                                name: "company",
                                widget: "#DisplayCard",
                                label: "company",
                                widgetProps: {icon: "#IconBuilding", parent: "company", valuePath: ["name"]},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "description"},
            dependent: "description",
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "description"},
                            field: {
                                name: "description",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
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
