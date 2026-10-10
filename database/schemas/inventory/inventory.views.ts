import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

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
                    props: {columns: 3},
                    children: [
                        {render: "#DisplayCard", permissions: {read: "quantityOnHand"}, field: {name: "quantityOnHand", widget: "#DisplayCard", label: "quantityOnHand", widgetProps: {icon: "#Hash"}}},
                        {render: "#DisplayCard", permissions: {read: "quantityReserved"}, field: {name: "quantityReserved", widget: "#DisplayCard", label: "quantityReserved", widgetProps: {icon: "#IconLock"}}},
                        {render: "#DisplayCard", permissions: {read: "quantityOnHand"}, field: {name: "quantityAvailable", widget: "#DisplayCard", label: "quantityAvailable", widgetProps: {icon: "#IconBox"}}},
                        {render: "#DisplayCard", permissions: {read: "reorderPoint"}, field: {name: "reorderPoint", widget: "#DisplayCard", label: "reorderPoint", widgetProps: {icon: "#IconAlertTriangle"}}},
                        {render: "#DisplayCard", permissions: {read: "reorderQuantity"}, field: {name: "reorderQuantity", widget: "#DisplayCard", label: "reorderQuantity", widgetProps: {icon: "#IconPackage"}}},
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
                    props: {columns: 3},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "product"},
                            field: {
                                name: "product",
                                widget: "#DisplayCard",
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
                            render: "#DisplayCard",
                            permissions: {read: "variant"},
                            field: {
                                name: "variant",
                                widget: "#DisplayCard",
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
                    ],
                },
            ],
        },
        {
            render: "#ReferencesViewModeScope",
            props: {
                storageKey: "inventory.sheet.movements.listDisplay",
                defaultMode: "compact",
            },
            children: [
                {
                    render: "#SheetGroup",
                    props: {
                        title: "movements",
                        titleActions: "#ReferencesViewModeToggle",
                        defaultOpen: true,
                    },
                    dependent: "movements",
                    dependentRuntimeOnly: true,
                    children: [
                        {
                            render: "div",
                            props: {className: "rounded-lg bg-muted/30 border border-border/50"},
                            children: [
                                {
                                    render: "#ReferencesRender",
                                    field: {
                                        name: "movements",
                                        widget: "#ReferencesRender",
                                        widgetProps: {
                                            cardWidget: "#InventoryMovementCard",
                                            itemDataProp: "movement",
                                            pageSize: 5,
                                            hideActions: true,
                                            compactRow: {
                                                icon: "#IconHistory",
                                                label: "movement",
                                                valuePath: ["reason", "quantity", "receiptNumber"],
                                                joinSeparator: " · ",
                                                linkedSheetModel: "inventoryMovements",
                                                linkedSheetWidget: "#InventoryMovementSheetView",
                                                linkedSheetEntityProp: "movement",
                                            },
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
            permissions: {writeAny: ["reorderPoint", "reorderQuantity"]},
            children: [
                {
                    render: "#Field",
                    permissions: {read: "reorderPoint", write: "reorderPoint"},
                    field: {name: "reorderPoint", widget: "#Input", label: "form.reorderPointLabel", widgetProps: {type: "number", min: 0}},
                },
                {
                    render: "#Field",
                    permissions: {read: "reorderQuantity", write: "reorderQuantity"},
                    field: {name: "reorderQuantity", widget: "#Input", label: "form.reorderQuantityLabel", widgetProps: {type: "number", min: 0}},
                },
            ],
        },
    ],
};

export const inventoryViews: ViewConfig[] = [inventorySheetView, inventoryCreateFormView, inventoryEditFormView];
