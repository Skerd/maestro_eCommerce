import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const discountTypeOptions = [
    {value: "percentage", label: "form.discountType.percentage"},
    {value: "fixed", label: "form.discountType.fixed"},
    {value: "free_shipping", label: "form.discountType.free_shipping"},
    {value: "buy_x_get_y", label: "form.discountType.buy_x_get_y"},
];

const discountAppliesToOptions = [
    {value: "order", label: "form.discountAppliesTo.order"},
    {value: "product", label: "form.discountAppliesTo.product"},
    {value: "collection", label: "form.discountAppliesTo.collection"},
    {value: "category", label: "form.discountAppliesTo.category"},
];

const discountFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "title", widget: "#Input", label: "form.titleLabel", required: true}},
            {render: "#Field", field: {name: "code", widget: "#Input", label: "form.codeLabel"}},
            {
                render: "#Field",
                field: {
                    name: "type",
                    widget: "#Select",
                    label: "form.typeLabel",
                    required: true,
                    widgetProps: {options: discountTypeOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "appliesTo",
                    widget: "#Select",
                    label: "form.appliesToLabel",
                    required: true,
                    widgetProps: {options: discountAppliesToOptions, className: "grow w-full"},
                },
            },
            {render: "#Field", field: {name: "value", widget: "#Input", label: "form.valueLabel", widgetProps: {type: "number", min: 0}, required: true}},
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
            {
                render: "#Field",
                field: {
                    name: "startsAt",
                    widget: "#DateInput",
                    label: "form.startsAtLabel",
                    required: true,
                    widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "endsAt",
                    widget: "#DateInput",
                    label: "form.endsAtLabel",
                    widgetProps: {valueFormat: "yyyy-MM-dd HH:mm"},
                },
            },
            {render: "#Field", field: {name: "minimumOrderAmount", widget: "#Input", label: "form.minimumOrderAmountLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "minimumQuantity", widget: "#Input", label: "form.minimumQuantityLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "usageLimit", widget: "#Input", label: "form.usageLimitLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "usageLimitPerCustomer", widget: "#Input", label: "form.usageLimitPerCustomerLabel", widgetProps: {type: "number", min: 0}}},
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "appliesTo", whenValues: ["product"]},
        children: [
            {
                render: "#Field",
                field: {
                    name: "targetIds",
                    widget: "#FormObjectIdChips",
                    label: "form.targetIdsLabel",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/product/select",
                        method: "POST",
                        placeholderKey: "form.selectProduct",
                        removeTooltipKey: "form.removeTarget",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "targetIds",
                    },
                },
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "appliesTo", whenValues: ["collection"]},
        children: [
            {
                render: "#Field",
                field: {
                    name: "targetIds",
                    widget: "#FormObjectIdChips",
                    label: "form.targetIdsLabel",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/collection/select",
                        method: "POST",
                        placeholderKey: "form.selectCollection",
                        removeTooltipKey: "form.removeTarget",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "targetIds",
                    },
                },
            },
        ],
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "appliesTo", whenValues: ["category"]},
        children: [
            {
                render: "#Field",
                field: {
                    name: "targetIds",
                    widget: "#FormObjectIdChips",
                    label: "form.targetIdsLabel",
                    widgetProps: {
                        apiUrl: "/api/eCommerce/category/select",
                        method: "POST",
                        placeholderKey: "form.selectCategory",
                        removeTooltipKey: "form.removeTarget",
                        selectPageSizeCreate: 50,
                        selectPageSizeEdit: 200,
                        labelRefFormExtraKey: "targetIds",
                    },
                },
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "customerGroups",
            widget: "#FormObjectIdChips",
            label: "form.customerGroupsLabel",
            widgetProps: {
                apiUrl: "/api/eCommerce/customerGroup/select",
                method: "POST",
                placeholderKey: "form.selectCustomerGroup",
                removeTooltipKey: "form.removeCustomerGroup",
                selectPageSizeCreate: 50,
                selectPageSizeEdit: 200,
                labelRefFormExtraKey: "customerGroups",
            },
        },
    },
    {
        render: "#FormWhenFieldValueIn",
        props: {watchField: "type", whenValues: ["buy_x_get_y"]},
        children: [
            {
                render: "#TitleWithCollapse",
                props: {title: "form.buyXGetYSectionTitle"},
                children: [
                    {
                        render: "#FormGrid",
                        props: {columns: 2},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "buyXGetY.buyQuantity",
                                    widget: "#Input",
                                    label: "form.buyQuantityLabel",
                                    widgetProps: {type: "number", min: 1},
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "buyXGetY.getQuantity",
                                    widget: "#Input",
                                    label: "form.getQuantityLabel",
                                    widgetProps: {type: "number", min: 1},
                                },
                            },
                        ],
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "buyXGetY.getProductIds",
                            widget: "#FormObjectIdChips",
                            label: "form.getProductIdsLabel",
                            widgetProps: {
                                apiUrl: "/api/eCommerce/product/select",
                                method: "POST",
                                placeholderKey: "form.selectProduct",
                                removeTooltipKey: "form.removeProduct",
                                selectPageSizeCreate: 50,
                                selectPageSizeEdit: 200,
                                labelRefFormExtraKey: "buyXGetY.getProductIds",
                            },
                        },
                    },
                ],
            },
        ],
    },
];

export const discountSheetView: ViewConfig = {
    model: "discounts",
    viewType: "sheet",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    header: {titleField: "title", subtitleKey: "discountSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#Tag", languageKeyCategory: "discountType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "appliesTo"}, field: {name: "appliesTo", widget: "#SmallInfoCard", label: "appliesTo", widgetProps: {icon: "#IconTarget", languageKeyCategory: "discountAppliesTo"}}},
                        {render: "#SmallInfoCard", permissions: {read: "code"}, field: {name: "code", widget: "#SmallInfoCard", label: "code", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "value"}, field: {name: "value", widget: "#SmallInfoCard", label: "value", widgetProps: {icon: "#IconPercent"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "usageCount"}, field: {name: "usageCount", widget: "#SmallInfoCard", label: "usageCount", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "startsAt"}, field: {name: "startsAt", widget: "#SmallInfoCard", label: "startsAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "endsAt"}, field: {name: "endsAt", widget: "#SmallInfoCard", label: "endsAt", widgetProps: {icon: "#Calendar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "minimumOrderAmount"}, field: {name: "minimumOrderAmount", widget: "#SmallInfoCard", label: "minimumOrderAmount", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "minimumQuantity"}, field: {name: "minimumQuantity", widget: "#SmallInfoCard", label: "minimumQuantity", widgetProps: {icon: "#Hash"}}},
                    ],
                },
            ],
        },
    ],
};

export const discountCreateFormView: ViewConfig = {
    model: "discounts",
    viewType: "form",
    viewMode: "create",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    method: "PUT",
    nodes: discountFormFields,
};

export const discountEditFormView: ViewConfig = {
    model: "discounts",
    viewType: "form",
    viewMode: "edit",
    accessModel: "discounts",
    apiUrl: "/api/eCommerce/discount",
    method: "PATCH",
    nodes: discountFormFields,
};

export const discountViews: ViewConfig[] = [discountSheetView, discountCreateFormView, discountEditFormView];
