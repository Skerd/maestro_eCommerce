import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {
    CUSTOMER_GROUP_DESCRIPTION_MAX,
    CUSTOMER_GROUP_NAME_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.schema-def";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";


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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "name"},
                            field: {
                                name: "name",
                                widget: "#DisplayCard",
                                label: "name",
                                widgetProps: {icon: "#Tag"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "memberCount"},
                            field: {
                                name: "memberCount",
                                widget: "#DisplayCard",
                                label: "memberCount",
                                widgetProps: {icon: "#IconUsers", type: "number"},
                            },
                        },
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
                    ],
                },
                {
                    render: "#SheetGrid",
                    props: {columns: 1},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "description"},
                            field: {
                                name: "description",
                                widget: "#DisplayCard",
                                label: "description",
                                widgetProps: {
                                    icon: "#IconAlignLeft",
                                    expandable: true,
                                    maxLength: 250,
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

const customerGroupCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 1},
        children: [
            {
                render: "#Field",
                field: {
                    name: "name",
                    widget: "#Input",
                    label: "form.nameLabel",
                    placeholder: "form.namePlaceholder",
                    required: true,
                    widgetProps: {maxLength: CUSTOMER_GROUP_NAME_MAX},
                }
            },
            {
                render: "#Field",
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {
                        className: "resize-none max-h-[200px] overflow-y-auto",
                        maxLength: CUSTOMER_GROUP_DESCRIPTION_MAX,
                    },
                },
            },
        ],
    },
];

const customerGroupEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 1},
        permissions: {writeAny: ["name", "description"]},
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
                    widgetProps: {maxLength: CUSTOMER_GROUP_NAME_MAX},
                },
            },
            {
                render: "#Field",
                permissions: {read: "description", write: "description"},
                field: {
                    name: "description",
                    widget: "#Textarea",
                    label: "form.descriptionLabel",
                    placeholder: "form.descriptionPlaceholder",
                    widgetProps: {
                        className: "resize-none max-h-[200px] overflow-y-auto",
                        maxLength: CUSTOMER_GROUP_DESCRIPTION_MAX,
                    },
                },
            },
        ],
    },
];

export const customerGroupCreateFormView: ViewConfig = {
    model: "customerGroups",
    viewType: "form",
    viewMode: "create",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    method: "PUT",
    nodes: customerGroupCreateFormNodes,
};

export const customerGroupEditFormView: ViewConfig = {
    model: "customerGroups",
    viewType: "form",
    viewMode: "edit",
    accessModel: "customerGroups",
    apiUrl: "/api/eCommerce/customerGroup",
    method: "PATCH",
    nodes: customerGroupEditFormNodes,
};

export const customerGroupViews: ViewConfig[] = [customerGroupSheetView, customerGroupCreateFormView, customerGroupEditFormView];
