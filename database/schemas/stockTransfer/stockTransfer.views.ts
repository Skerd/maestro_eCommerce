import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {STOCK_TRANSFER_NOTE_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/stockTransfer.schema-def";

const warehouseSelectProps = {
    apiUrl: "/api/eCommerce/warehouse/select",
    method: "POST",
    normalizeEmptyToUndefined: true,
};

const warehouseCard = (name: "fromWarehouse" | "toWarehouse") => ({
    render: "#DisplayCard",
    permissions: {read: name},
    field: {
        name,
        widget: "#DisplayCard",
        label: name,
        widgetProps: {
            icon: "#IconBuildingWarehouse",
            parent: name,
            valuePath: ["name"],
            linkedRefPath: name,
            linkedSheetModel: "warehouses",
            linkedSheetWidget: "#WarehouseSheetView",
            linkedSheetEntityProp: "warehouse",
        },
    },
});

/** Product → variant per line; the variant picker lists the row's product's variants. */
const linesRepeater = (permissions?: {read: string; write: string}) => ({
    render: "#Field",
    ...(permissions ? {permissions} : {}),
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
                                widgetProps: {
                                    apiUrl: "/api/eCommerce/product/select",
                                    method: "POST",
                                    normalizeEmptyToUndefined: true,
                                    cascadeClearFormFields: ["variant"],
                                },
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "variant",
                                widget: "#ApiSelect",
                                label: "form.variantLabel",
                                placeholder: "form.variantPlaceholder",
                                widgetProps: {
                                    apiUrl: "/api/eCommerce/productVariant/select",
                                    method: "POST",
                                    normalizeEmptyToUndefined: true,
                                    postBodyFromFormFields: [{field: "product", paramName: "product"}],
                                },
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "quantity",
                                widget: "#Input",
                                label: "form.quantityLabel",
                                required: true,
                                widgetProps: {type: "number", min: 0, step: "any"},
                            },
                        },
                    ],
                },
            ],
        },
    },
});

const noteField = (permissions?: {read: string; write: string}) => ({
    render: "#Field",
    ...(permissions ? {permissions} : {}),
    field: {
        name: "note",
        widget: "#Textarea",
        label: "form.noteLabel",
        placeholder: "form.notePlaceholder",
        widgetProps: {rows: 3, className: "field-sizing-fixed max-h-56 min-h-16 overflow-y-auto", maxLength: STOCK_TRANSFER_NOTE_MAX},
    },
});

const warehouseFields = (withPermissions: boolean): ViewConfig["nodes"] => [
    {
        render: "#FormGrid",
        props: {columns: 2},
        ...(withPermissions ? {permissions: {writeAny: ["fromWarehouse", "toWarehouse"]}} : {}),
        children: (["fromWarehouse", "toWarehouse"] as const).map(name => ({
            render: "#Field",
            ...(withPermissions ? {permissions: {read: name, write: name}} : {}),
            field: {
                name,
                widget: "#ApiSelect",
                label: `form.${name}Label`,
                placeholder: `form.${name}Placeholder`,
                required: true,
                widgetProps: warehouseSelectProps,
            },
        })),
    },
];

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
                        warehouseCard("fromWarehouse"),
                        warehouseCard("toWarehouse"),
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "stockTransferStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
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
                            permissions: {read: "doneBy"},
                            field: {
                                name: "doneBy",
                                widget: "#DisplayCard",
                                label: "doneBy",
                                widgetProps: {icon: "#IconUser", parent: "doneBy", valuePath: ["name"], type: "user"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "note"},
                            field: {
                                name: "note",
                                widget: "#DisplayCard",
                                label: "note",
                                widgetProps: {icon: "#IconNote", expandable: true, maxLength: 250},
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
                                            compactSummaryFields: ["product", "quantity"],
                                            fields: [
                                                {
                                                    name: "product",
                                                    type: "linkedRef",
                                                    className: "text-sm font-medium",
                                                    valuePath: ["title", "sku"],
                                                    joinSeparator: " · ",
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
        lifecycleSheetGroup,
    ],
};

export const stockTransferCreateFormView: ViewConfig = {
    model: "stockTransfers",
    viewType: "form",
    viewMode: "create",
    accessModel: "stockTransfers",
    apiUrl: "/api/eCommerce/stockTransfer",
    method: "PUT",
    nodes: [...warehouseFields(false), noteField(), linesRepeater()],
};

export const stockTransferEditFormView: ViewConfig = {
    model: "stockTransfers",
    viewType: "form",
    viewMode: "edit",
    accessModel: "stockTransfers",
    apiUrl: "/api/eCommerce/stockTransfer",
    method: "PATCH",
    nodes: [
        ...warehouseFields(true),
        noteField({read: "note", write: "note"}),
        linesRepeater({read: "lines", write: "lines"}),
    ],
};

export const stockTransferViews: ViewConfig[] = [stockTransferSheetView, stockTransferCreateFormView, stockTransferEditFormView];
