import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {STOCK_TRANSFER_NOTE_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/stockTransfer.schema-def";

const warehouseSelectProps = {
    apiUrl: "/api/eCommerce/warehouse/select",
    normalizeEmptyToUndefined: true,
};

const productSelectProps = {
    apiUrl: "/api/eCommerce/product/select",
    normalizeEmptyToUndefined: true,
    cascadeClearFormFields: ["variant"],
};

/** The variant picker lists the row's product's variants. */
const variantSelectProps = {
    apiUrl: "/api/eCommerce/productVariant/select",
    normalizeEmptyToUndefined: true,
    postBodyFromFormFields: [{field: "product", paramName: "product"}],
};

const noteWidgetProps = {rows: 3, className: "field-sizing-fixed max-h-56 min-h-16 overflow-y-auto", maxLength: STOCK_TRANSFER_NOTE_MAX};

export const stockTransferSheetView: ViewConfig = {
    model: "stockTransfers",
    viewType: "sheet",
    accessModel: "stockTransfers",
    apiUrl: "/api/eCommerce/stockTransfer",
    header: {titleField: "fromWarehouse.name", subtitleKey: "stockTransferSubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "fromWarehouse"},
                            field: {
                                name: "fromWarehouse",
                                widget: "#DisplayCard",
                                label: "fromWarehouse",
                                widgetProps: {
                                    icon: "#IconBuildingWarehouse",
                                    parent: "fromWarehouse",
                                    valuePath: ["name"],
                                    linkedRefPath: "fromWarehouse",
                                    linkedSheetModel: "warehouses",
                                    linkedSheetWidget: "#WarehouseSheetView",
                                    linkedSheetEntityProp: "warehouse",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "toWarehouse"},
                            field: {
                                name: "toWarehouse",
                                widget: "#DisplayCard",
                                label: "toWarehouse",
                                widgetProps: {
                                    icon: "#IconBuildingWarehouse",
                                    parent: "toWarehouse",
                                    valuePath: ["name"],
                                    linkedRefPath: "toWarehouse",
                                    linkedSheetModel: "warehouses",
                                    linkedSheetWidget: "#WarehouseSheetView",
                                    linkedSheetEntityProp: "warehouse",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "doneAt",
                            permissions: {read: "doneAt"},
                            field: {
                                name: "doneAt",
                                widget: "#DisplayCard",
                                label: "doneAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            dependent: "doneBy",
                            permissions: {read: "doneBy"},
                            field: {
                                name: "doneBy",
                                widget: "#DisplayCard",
                                label: "doneBy",
                                widgetProps: {icon: "#IconUser", parent: "doneBy", valuePath: ["name"], type: "user"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {storageKey: "stockTransfer.sheet.lines.listDisplay", defaultMode: "cards"},
            children: [
                {
                    render: "#SheetGroup",
                    props: {title: "lines", titleActions: "#ReferencesViewModeToggle", defaultOpen: true},
                    dependent: "lines",
                    permissions: {read: "lines"},
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    permissions: {read: "lines"},
                                    field: {
                                        name: "lines",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 10,
                                            entityCards: true,
                                            columns: 2,
                                            compactSummaryFields: ["product", "quantity"],
                                            fields: [
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title"],
                                                    labelKey: "lineProduct",
                                                    linkedSheetModel: "products",
                                                    linkedSheetWidget: "#ProductSheetView",
                                                    linkedSheetEntityProp: "product",
                                                    icon: "#IconPackage",
                                                },
                                                {
                                                    name: "variant",
                                                    type: "linkedRef",
                                                    className: "text-sm",
                                                    valuePath: ["sku"],
                                                    labelKey: "lineVariant",
                                                    linkedSheetModel: "productVariants",
                                                    linkedSheetWidget: "#ProductVariantSheetView",
                                                    linkedSheetEntityProp: "entity",
                                                    icon: "#IconTag",
                                                },
                                                {name: "quantity", type: "text", className: "text-sm", labelKey: "lineQuantity"},
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "note", defaultOpen: true},
            dependent: "note",
            permissions: {read: "note"},
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "note"},
                            field: {name: "note", widget: "#ExpandableText", widgetProps: {className: "text-sm whitespace-pre-wrap"}},
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

/** From where to where, what moves, then any remark. */
const stockTransferCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.routeSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {
                            name: "fromWarehouse",
                            widget: "#ApiSelect",
                            label: "form.fromWarehouseLabel",
                            placeholder: "form.fromWarehousePlaceholder",
                            required: true,
                            widgetProps: warehouseSelectProps,
                        },
                    },
                    {
                        render: "#Field",
                        field: {
                            name: "toWarehouse",
                            widget: "#ApiSelect",
                            label: "form.toWarehouseLabel",
                            placeholder: "form.toWarehousePlaceholder",
                            required: true,
                            widgetProps: warehouseSelectProps,
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#Field",
        field: {
            name: "lines",
            widget: "#FormRepeater",
            widgetProps: {
                title: "form.linesSectionTitle",
                arrayField: "lines",
                defaultItem: {product: "", quantity: 1},
                addLabel: "form.lineAddRow",
                removeLabel: "form.lineRemoveRow",
                rowTitleFields: ["product"],
                rowTitlePlaceholder: "form.lineRowTitle",
                rowTemplate: [
                    {
                        render: "#FormGrid",
                        props: {columns: 3},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "product",
                                    widget: "#ApiSelect",
                                    label: "form.productLabel",
                                    placeholder: "form.productPlaceholder",
                                    required: true,
                                    widgetProps: productSelectProps,
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "variant",
                                    widget: "#ApiSelect",
                                    label: "form.variantLabel",
                                    placeholder: "form.variantPlaceholder",
                                    widgetProps: variantSelectProps,
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "quantity",
                                    widget: "#Input",
                                    label: "form.quantityLabel",
                                    required: true,
                                    // Stock may be kept in fractions (kg, m), so no whole-number step.
                                    widgetProps: {type: "number", min: 0, step: "any"},
                                },
                            },
                        ],
                    },
                ],
            },
        },
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.noteSectionTitle", defaultOpen: true},
        children: [
            {
                render: "#Field",
                field: {
                    name: "note",
                    widget: "#Textarea",
                    label: "form.noteLabel",
                    placeholder: "form.notePlaceholder",
                    widgetProps: noteWidgetProps,
                },
            },
        ],
    },
];

const stockTransferEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.routeSectionTitle", defaultOpen: true},
        permissions: {readAny: ["fromWarehouse", "toWarehouse"], writeAny: ["fromWarehouse", "toWarehouse"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "fromWarehouse", write: "fromWarehouse"},
                        field: {
                            name: "fromWarehouse",
                            widget: "#ApiSelect",
                            label: "form.fromWarehouseLabel",
                            placeholder: "form.fromWarehousePlaceholder",
                            required: true,
                            widgetProps: warehouseSelectProps,
                        },
                    },
                    {
                        render: "#Field",
                        permissions: {read: "toWarehouse", write: "toWarehouse"},
                        field: {
                            name: "toWarehouse",
                            widget: "#ApiSelect",
                            label: "form.toWarehouseLabel",
                            placeholder: "form.toWarehousePlaceholder",
                            required: true,
                            widgetProps: warehouseSelectProps,
                        },
                    },
                ],
            },
        ],
    },
    {
        render: "#Field",
        permissions: {read: "lines", write: "lines"},
        field: {
            name: "lines",
            widget: "#FormRepeater",
            widgetProps: {
                title: "form.linesSectionTitle",
                arrayField: "lines",
                defaultItem: {product: "", quantity: 1},
                addLabel: "form.lineAddRow",
                removeLabel: "form.lineRemoveRow",
                rowTitleFields: ["product"],
                rowTitlePlaceholder: "form.lineRowTitle",
                rowTemplate: [
                    {
                        render: "#FormGrid",
                        props: {columns: 3},
                        children: [
                            {
                                render: "#Field",
                                field: {
                                    name: "product",
                                    widget: "#ApiSelect",
                                    label: "form.productLabel",
                                    placeholder: "form.productPlaceholder",
                                    required: true,
                                    widgetProps: productSelectProps,
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "variant",
                                    widget: "#ApiSelect",
                                    label: "form.variantLabel",
                                    placeholder: "form.variantPlaceholder",
                                    widgetProps: variantSelectProps,
                                },
                            },
                            {
                                render: "#Field",
                                field: {
                                    name: "quantity",
                                    widget: "#Input",
                                    label: "form.quantityLabel",
                                    required: true,
                                    // Stock may be kept in fractions (kg, m), so no whole-number step.
                                    widgetProps: {type: "number", min: 0, step: "any"},
                                },
                            },
                        ],
                    },
                ],
            },
        },
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.noteSectionTitle", defaultOpen: true},
        permissions: {readAny: ["note"], writeAny: ["note"]},
        children: [
            {
                render: "#Field",
                permissions: {read: "note", write: "note"},
                field: {
                    name: "note",
                    widget: "#Textarea",
                    label: "form.noteLabel",
                    placeholder: "form.notePlaceholder",
                    widgetProps: noteWidgetProps,
                },
            },
        ],
    },
];

export const stockTransferCreateFormView: ViewConfig = {
    model: "stockTransfers",
    viewType: "form",
    viewMode: "create",
    accessModel: "stockTransfers",
    apiUrl: "/api/eCommerce/stockTransfer",
    method: "PUT",
    nodes: stockTransferCreateFormNodes,
};

export const stockTransferEditFormView: ViewConfig = {
    model: "stockTransfers",
    viewType: "form",
    viewMode: "edit",
    accessModel: "stockTransfers",
    apiUrl: "/api/eCommerce/stockTransfer",
    method: "PATCH",
    nodes: stockTransferEditFormNodes,
};

export const stockTransferViews: ViewConfig[] = [stockTransferSheetView, stockTransferCreateFormView, stockTransferEditFormView];
