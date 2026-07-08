import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

const pricingRuleTypeOptions = [
    {value: "percentage_discount", label: "form.pricingRuleType.percentage_discount"},
    {value: "fixed_discount", label: "form.pricingRuleType.fixed_discount"},
    {value: "fixed_price", label: "form.pricingRuleType.fixed_price"},
    {value: "surcharge", label: "form.pricingRuleType.surcharge"},
];

const pricingRuleAppliesToOptions = [
    {value: "all", label: "form.pricingRuleAppliesTo.all"},
    {value: "product", label: "form.pricingRuleAppliesTo.product"},
    {value: "category", label: "form.pricingRuleAppliesTo.category"},
    {value: "collection", label: "form.pricingRuleAppliesTo.collection"},
    {value: "customer_group", label: "form.pricingRuleAppliesTo.customer_group"},
];

const pricingRuleFormFields: ViewConfig["nodes"] = [
    {
        render: "#FormGrid",
        props: {columns: 2},
        children: [
            {render: "#Field", field: {name: "name", widget: "#Input", label: "form.nameLabel", required: true}},
            {
                render: "#Field",
                field: {
                    name: "type",
                    widget: "#Select",
                    label: "form.typeLabel",
                    required: true,
                    widgetProps: {options: pricingRuleTypeOptions, className: "grow w-full"},
                },
            },
            {
                render: "#Field",
                field: {
                    name: "appliesTo",
                    widget: "#Select",
                    label: "form.appliesToLabel",
                    required: true,
                    widgetProps: {options: pricingRuleAppliesToOptions, className: "grow w-full"},
                },
            },
            {render: "#Field", field: {name: "value", widget: "#Input", label: "form.valueLabel", required: true, widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "priority", widget: "#Input", label: "form.priorityLabel", widgetProps: {type: "number", min: 0}}},
            {render: "#Field", field: {name: "isActive", widget: "#Checkbox", label: "form.isActiveLabel"}},
            {
                render: "#Field",
                field: {
                    name: "startsAt",
                    widget: "#DateInput",
                    label: "form.startsAtLabel",
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
];

export const pricingRuleSheetView: ViewConfig = {
    model: "pricingRules",
    viewType: "sheet",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    header: {titleField: "name", subtitleKey: "pricingRuleSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "type"}, field: {name: "type", widget: "#SmallInfoCard", label: "type", widgetProps: {icon: "#IconTag", languageKeyCategory: "pricingRuleType"}}},
                        {render: "#SmallInfoCard", permissions: {read: "appliesTo"}, field: {name: "appliesTo", widget: "#SmallInfoCard", label: "appliesTo", widgetProps: {icon: "#IconTarget", languageKeyCategory: "pricingRuleAppliesTo"}}},
                        {render: "#SmallInfoCard", permissions: {read: "value"}, field: {name: "value", widget: "#SmallInfoCard", label: "value", widgetProps: {icon: "#IconPercent"}}},
                        {render: "#SmallInfoCard", permissions: {read: "isActive"}, field: {name: "isActive", widget: "#SmallInfoCard", label: "isActive", widgetProps: {icon: "#IconToggleRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "priority"}, field: {name: "priority", widget: "#SmallInfoCard", label: "priority", widgetProps: {icon: "#Hash"}}},
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

export const pricingRuleCreateFormView: ViewConfig = {
    model: "pricingRules",
    viewType: "form",
    viewMode: "create",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    method: "PUT",
    nodes: pricingRuleFormFields,
};

export const pricingRuleEditFormView: ViewConfig = {
    model: "pricingRules",
    viewType: "form",
    viewMode: "edit",
    accessModel: "pricingRules",
    apiUrl: "/api/eCommerce/pricingRule",
    method: "PATCH",
    nodes: pricingRuleFormFields,
};

export const pricingRuleViews: ViewConfig[] = [pricingRuleSheetView, pricingRuleCreateFormView, pricingRuleEditFormView];
