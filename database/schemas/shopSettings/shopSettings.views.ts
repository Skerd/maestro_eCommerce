import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

/** The shop's settings, edited in place on the What we sell page (P26.8). */
export const shopSettingsEditFormView: ViewConfig = {
    model: "shopsettings",
    viewType: "form",
    viewMode: "edit",
    accessModel: "shopsettings",
    apiUrl: "/api/eCommerce/shopSettings",
    method: "PATCH",
    nodes: [
        {
            render: "#TitleWithCollapse",
            props: {title: "form.whatWeSellSectionTitle"},
            permissions: {readAny: ["branches"], writeAny: ["branches"]},
            children: [
                {
                    render: "#Field",
                    permissions: {read: "branches", write: "branches"},
                    field: {
                        name: "branches",
                        widget: "#ObjectIdChipsInput",
                        label: "form.branchesLabel",
                        widgetProps: {
                            apiUrl: "/api/eCommerce/category/select",
                            postBody: {topLevel: true},
                            placeholderKey: "form.selectBranch",
                            removeTooltipKey: "form.removeBranch",
                            selectPageSizeCreate: 50,
                            selectPageSizeEdit: 50,
                            labelRefFormExtraKey: "branches",
                        },
                    },
                },
            ],
        },
    ],
};

export const shopSettingsViews: ViewConfig[] = [shopSettingsEditFormView];
