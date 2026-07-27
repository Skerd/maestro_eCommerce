import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";

export const inventorySheetView: ViewConfig = {
    model: "inventories",
    viewType: "sheet",
    accessModel: "inventories",
    apiUrl: "/api/eCommerce/inventory",
    header: {titleField: "product.title", subtitleKey: "inventorySubtitle", showCloseButton: true},
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "quantityOnHand", widget: "#SmallInfoCard", label: "quantityOnHand", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityReserved", widget: "#SmallInfoCard", label: "quantityReserved", widgetProps: {icon: "#IconLock"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityAvailable", widget: "#SmallInfoCard", label: "quantityAvailable", widgetProps: {icon: "#IconBox"}}},
                        {render: "#SmallInfoCard", field: {name: "reorderPoint", widget: "#SmallInfoCard", label: "reorderPoint", widgetProps: {icon: "#IconAlertTriangle"}}},
                        {render: "#SmallInfoCard", field: {name: "reorderQuantity", widget: "#SmallInfoCard", label: "reorderQuantity", widgetProps: {icon: "#IconPackage"}}},
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "related", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "product",
                                widget: "#SmallInfoCard",
                                label: "product",
                                widgetProps: {
                                    icon: "#IconPackage",
                                    parent: "product",
                                    valuePath: ["title"],
                                    linkedRefPath: "product",
                                    linkedSheetModel: "products",
                                    linkedSheetWidget: "#ProductSheetView",
                                    linkedSheetEntityProp: "product",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "variant",
                                widget: "#SmallInfoCard",
                                label: "variant",
                                widgetProps: {
                                    icon: "#IconTag",
                                    parent: "variant",
                                    valuePath: ["sku"],
                                    linkedRefPath: "variant",
                                    linkedSheetModel: "productVariants",
                                    linkedSheetWidget: "#ProductVariantSheetView",
                                    linkedSheetEntityProp: "entity",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            field: {
                                name: "warehouse",
                                widget: "#SmallInfoCard",
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
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "inventory.sheet.movements.listDisplay",
                defaultMode: "cards",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "movements",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    children: [
                        {
                            render: "div",
                            props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#SheetEmbeddedItemsList",
                                    field: {
                                        name: "movements",
                                        widget: "#SheetEmbeddedItemsList",
                                        widgetProps: {
                                            pageSize: 5,
                                            compactSummaryFields: ["reason", "quantity", "occurredAt"],
                                            fields: [
                                                {
                                                    name: "reason",
                                                    type: "text",
                                                    className: "text-sm font-medium capitalize",
                                                    languageKeyCategory: "movementReasons",
                                                    labelKey: "movementReason",
                                                },
                                                {
                                                    name: "quantity",
                                                    type: "text",
                                                    className: "text-sm font-medium",
                                                    labelKey: "movementQuantity",
                                                },
                                                {
                                                    name: "quantityBefore",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "movementQuantityBefore",
                                                },
                                                {
                                                    name: "quantityAfter",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "movementQuantityAfter",
                                                },
                                                {
                                                    name: "occurredAt",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "dateTime",
                                                    labelKey: "movementOccurredAt",
                                                },
                                                {
                                                    name: "manufacturer",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "movementManufacturer",
                                                },
                                                {
                                                    name: "receiptNumber",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "movementReceiptNumber",
                                                },
                                                {
                                                    name: "unitCost",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "movementUnitCost",
                                                },
                                                {
                                                    name: "batchLot",
                                                    type: "text",
                                                    className: "text-sm",
                                                    labelKey: "movementBatchLot",
                                                },
                                                {
                                                    name: "expiryDate",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    format: "date",
                                                    labelKey: "movementExpiryDate",
                                                },
                                                {
                                                    name: "performedBy",
                                                    type: "text",
                                                    className: "text-xs text-muted-foreground",
                                                    valuePath: ["name", "surname"],
                                                    joinSeparator: " ",
                                                    labelKey: "movementPerformedBy",
                                                },
                                                {
                                                    name: "note",
                                                    type: "expandableText",
                                                    className: "text-sm",
                                                    labelKey: "movementNote",
                                                },
                                                {
                                                    name: "receipts",
                                                    type: "mediaStrip",
                                                    labelKey: "movementReceipts",
                                                },
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
    ],
};

export const inventoryCreateFormView: ViewConfig = {
    model: "inventories",
    viewType: "form",
    viewMode: "create",
    accessModel: "inventories",
    apiUrl: "/api/eCommerce/inventory",
    method: "PUT",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 2},
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
                        },
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "warehouse",
                        widget: "#ApiSelect",
                        label: "form.warehouseLabel",
                        placeholder: "form.warehousePlaceholder",
                        required: true,
                        widgetProps: {
                            apiUrl: "/api/eCommerce/warehouse/select",
                            method: "POST",
                            normalizeEmptyToUndefined: true,
                        },
                    },
                },
                {render: "#Field", field: {name: "quantityOnHand", widget: "#Input", label: "form.quantityOnHandLabel", widgetProps: {type: "number", min: 0}}},
                {render: "#Field", field: {name: "reorderPoint", widget: "#Input", label: "form.reorderPointLabel", widgetProps: {type: "number", min: 0}}},
                {render: "#Field", field: {name: "reorderQuantity", widget: "#Input", label: "form.reorderQuantityLabel", widgetProps: {type: "number", min: 0}}},
            ],
        },
    ],
};

export const inventoryEditFormView: ViewConfig = {
    model: "inventories",
    viewType: "form",
    viewMode: "edit",
    accessModel: "inventories",
    apiUrl: "/api/eCommerce/inventory",
    method: "PATCH",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 2},
            children: [
                {render: "#Field", field: {name: "reorderPoint", widget: "#Input", label: "form.reorderPointLabel", widgetProps: {type: "number", min: 0}}},
                {render: "#Field", field: {name: "reorderQuantity", widget: "#Input", label: "form.reorderQuantityLabel", widgetProps: {type: "number", min: 0}}},
            ],
        },
    ],
};

export const inventoryViews: ViewConfig[] = [inventorySheetView, inventoryCreateFormView, inventoryEditFormView];
