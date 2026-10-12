import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";
import {STOCK_COUNT_NOTE_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockCount/stockCount.schema-def";

const noteField = (permissions?: {read: string; write: string}) => ({
    render: "#Field",
    ...(permissions ? {permissions} : {}),
    field: {
        name: "note",
        widget: "#Textarea",
        label: "form.noteLabel",
        placeholder: "form.notePlaceholder",
        widgetProps: {rows: 3, className: "field-sizing-fixed max-h-56 min-h-16 overflow-y-auto", maxLength: STOCK_COUNT_NOTE_MAX},
    },
});

export const stockCountSheetView: ViewConfig = {
    model: "stockCounts",
    viewType: "sheet",
    accessModel: "stockCounts",
    apiUrl: "/api/eCommerce/stockCount",
    header: {titleField: "warehouse.name", subtitleKey: "stockCountSubtitle", showCloseButton: true},
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
                            permissions: {read: "warehouse"},
                            field: {
                                name: "warehouse",
                                widget: "#DisplayCard",
                                label: "warehouse",
                                widgetProps: {
                                    icon: "#IconBuildingWarehouse",
                                    parent: "warehouse",
                                    valuePath: ["name"],
                                    linkedRefPath: "warehouse",
                                    linkedSheetModel: "warehouses",
                                    linkedSheetWidget: "#WarehouseSheetView",
                                    linkedSheetEntityProp: "warehouse",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "status"},
                            field: {
                                name: "status",
                                widget: "#DisplayCard",
                                label: "status",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "stockCountStatus", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "appliedAt"},
                            field: {
                                name: "appliedAt",
                                widget: "#DisplayCard",
                                label: "appliedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "appliedBy"},
                            field: {
                                name: "appliedBy",
                                widget: "#DisplayCard",
                                label: "appliedBy",
                                widgetProps: {icon: "#IconUser", parent: "appliedBy", valuePath: ["name"], type: "user"},
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
            props: {storageKey: "stockCount.sheet.lines.listDisplay", defaultMode: "cards"},
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
                                            compactSummaryFields: ["product", "expectedQuantity", "countedQuantity"],
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
                                                {name: "expectedQuantity", type: "text", className: "text-sm", labelKey: "lineExpectedQuantity"},
                                                {name: "countedQuantity", type: "text", className: "text-sm", labelKey: "lineCountedQuantity"},
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

/** A new count only needs its warehouse: every stock row there becomes a line to count. */
export const stockCountCreateFormView: ViewConfig = {
    model: "stockCounts",
    viewType: "form",
    viewMode: "create",
    accessModel: "stockCounts",
    apiUrl: "/api/eCommerce/stockCount",
    method: "PUT",
    nodes: [
        {
            render: "#Field",
            field: {
                name: "warehouse",
                widget: "#ApiSelect",
                label: "form.warehouseLabel",
                placeholder: "form.warehousePlaceholder",
                required: true,
                widgetProps: {apiUrl: "/api/eCommerce/warehouse/select", method: "POST", normalizeEmptyToUndefined: true},
            },
        },
        noteField(),
    ],
};

/** Enter what was counted per line; lines can be added for items found that had no stock row. */
export const stockCountEditFormView: ViewConfig = {
    model: "stockCounts",
    viewType: "form",
    viewMode: "edit",
    accessModel: "stockCounts",
    apiUrl: "/api/eCommerce/stockCount",
    method: "PATCH",
    nodes: [
        noteField({read: "note", write: "note"}),
        {
            render: "#Field",
            permissions: {read: "lines", write: "lines"},
            field: {
                name: "lines",
                widget: "#FormRepeater",
                widgetProps: {
                    title: "form.linesSectionTitle",
                    arrayField: "lines",
                    defaultItem: {product: ""},
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
                                        name: "countedQuantity",
                                        widget: "#Input",
                                        label: "form.countedQuantityLabel",
                                        placeholder: "form.countedQuantityPlaceholder",
                                        widgetProps: {type: "number", min: 0, step: "any"},
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        },
    ],
};

export const stockCountViews: ViewConfig[] = [stockCountSheetView, stockCountCreateFormView, stockCountEditFormView];
