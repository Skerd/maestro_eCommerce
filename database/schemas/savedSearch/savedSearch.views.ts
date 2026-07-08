import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const savedSearchSheetView: ViewConfig = {
    model: "savedsearches",
    viewType: "sheet",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    header: {
        titleField: "name",
        subtitleKey: "eCommerce.savedSearch",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "filters"},
            children: [
                {
                    render: "#ExpandableText",
                    permissions: {read: "filters"},
                    field: {
                        name: "filters",
                        widget: "#ExpandableText",
                        label: "filters",
                    },
                },
            ],
        },
    ],
};

export const savedSearchCreateFormView: ViewConfig = {
    model: "savedsearches",
    viewType: "form",
    viewMode: "create",
    accessModel: "savedsearches",
    apiUrl: "/api/eCommerce/savedSearch",
    method: "PUT",
    nodes: [
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
                        required: true,
                    },
                },
            ],
        },
    ],
};

export const savedSearchViews: ViewConfig[] = [savedSearchSheetView, savedSearchCreateFormView];
