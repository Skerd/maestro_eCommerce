import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

const productSelectProps = {
    apiUrl: "/api/eCommerce/product/select",
    method: "POST",
    pageSize: 50,
    normalizeEmptyToUndefined: true,
    cascadeClearFormFields: ["variant"],
};

const variantSelectProps = {
    apiUrl: "/api/eCommerce/productVariant/select",
    method: "POST",
    pageSize: 50,
    normalizeEmptyToUndefined: true,
    postBodyFromFormField: {field: "product", paramName: "product"},
    remountKeyFormField: "product",
};

const warehouseSelectProps = {
    apiUrl: "/api/eCommerce/warehouse/select",
    method: "POST",
    pageSize: 50,
    normalizeEmptyToUndefined: true,
};

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
                        {
                            render: "#DisplayCard",
                            permissions: {read: "quantityOnHand"},
                            field: {
                                name: "quantityOnHand",
                                widget: "#DisplayCard",
                                label: "quantityOnHand",
                                widgetProps: {icon: "#Hash", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "quantityReserved"},
                            field: {
                                name: "quantityReserved",
                                widget: "#DisplayCard",
                                label: "quantityReserved",
                                widgetProps: {icon: "#IconLock", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "quantityOnHand"},
                            field: {
                                name: "quantityAvailable",
                                widget: "#DisplayCard",
                                label: "quantityAvailable",
                                skipReadAccessGate: true,
                                widgetProps: {icon: "#IconBox", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "reorderPoint"},
                            field: {
                                name: "reorderPoint",
                                widget: "#DisplayCard",
                                label: "reorderPoint",
                                widgetProps: {icon: "#IconAlertTriangle", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "reorderQuantity"},
                            field: {
                                name: "reorderQuantity",
                                widget: "#DisplayCard",
                                label: "reorderQuantity",
                                widgetProps: {icon: "#IconPackage", type: "number"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "lowStockAlertSent"},
                            field: {
                                name: "lowStockAlertSent",
                                widget: "#DisplayCard",
                                label: "lowStockAlertSent",
                                widgetProps: {icon: "#IconToggleRight", type: "boolean"},
                            },
                        },
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
            render: "#TitleWithCollapse",
            props: {title: "form.assignmentSectionTitle", defaultOpen: true},
            children: [
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
                                name: "warehouse",
                                widget: "#ApiSelect",
                                label: "form.warehouseLabel",
                                placeholder: "form.warehousePlaceholder",
                                required: true,
                                widgetProps: warehouseSelectProps,
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#TitleWithCollapse",
            props: {title: "form.stockSectionTitle", defaultOpen: true},
            children: [
                {
                    render: "#FormGrid",
                    props: {columns: 3},
                    children: [
                        {
                            render: "#Field",
                            field: {
                                name: "quantityOnHand",
                                widget: "#Input",
                                label: "form.quantityOnHandLabel",
                                placeholder: "form.quantityOnHandPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "reorderPoint",
                                widget: "#Input",
                                label: "form.reorderPointLabel",
                                placeholder: "form.reorderPointPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                        {
                            render: "#Field",
                            field: {
                                name: "reorderQuantity",
                                widget: "#Input",
                                label: "form.reorderQuantityLabel",
                                placeholder: "form.reorderQuantityPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                    ],
                },
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
            render: "#TitleWithCollapse",
            props: {title: "form.assignmentSectionTitle", defaultOpen: true},
            permissions: {readAny: ["product", "variant", "warehouse"]},
            children: [
                {
                    render: "#FormGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#Field",
                            permissions: {read: "product"},
                            field: {
                                name: "product",
                                widget: "#ApiSelect",
                                label: "form.productLabel",
                                placeholder: "form.productPlaceholder",
                                skipWriteAccessGate: true,
                                widgetProps: productSelectProps,
                            },
                        },
                        {
                            render: "#Field",
                            permissions: {read: "variant"},
                            field: {
                                name: "variant",
                                widget: "#ApiSelect",
                                label: "form.variantLabel",
                                placeholder: "form.variantPlaceholder",
                                skipWriteAccessGate: true,
                                widgetProps: variantSelectProps,
                            },
                        },
                        {
                            render: "#Field",
                            permissions: {read: "warehouse"},
                            field: {
                                name: "warehouse",
                                widget: "#ApiSelect",
                                label: "form.warehouseLabel",
                                placeholder: "form.warehousePlaceholder",
                                skipWriteAccessGate: true,
                                widgetProps: warehouseSelectProps,
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#TitleWithCollapse",
            props: {title: "form.stockSectionTitle"},
            permissions: {writeAny: ["reorderPoint", "reorderQuantity"]},
            children: [
                {
                    render: "#FormGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#Field",
                            permissions: {read: "reorderPoint", write: "reorderPoint"},
                            field: {
                                name: "reorderPoint",
                                widget: "#Input",
                                label: "form.reorderPointLabel",
                                placeholder: "form.reorderPointPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                        {
                            render: "#Field",
                            permissions: {read: "reorderQuantity", write: "reorderQuantity"},
                            field: {
                                name: "reorderQuantity",
                                widget: "#Input",
                                label: "form.reorderQuantityLabel",
                                placeholder: "form.reorderQuantityPlaceholder",
                                widgetProps: {type: "number", min: 0},
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

export const inventoryViews: ViewConfig[] = [inventorySheetView, inventoryCreateFormView, inventoryEditFormView];
