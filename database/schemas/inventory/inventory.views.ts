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
                    props: {columns: 3},
                    children: [
                        {render: "#SmallInfoCard", permissions: {read: "quantityOnHand"}, field: {name: "quantityOnHand", widget: "#SmallInfoCard", label: "quantityOnHand", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "quantityReserved"}, field: {name: "quantityReserved", widget: "#SmallInfoCard", label: "quantityReserved", widgetProps: {icon: "#IconLock"}}},
                        {render: "#SmallInfoCard", permissions: {read: "quantityAvailable"}, field: {name: "quantityAvailable", widget: "#SmallInfoCard", label: "quantityAvailable", widgetProps: {icon: "#IconBox"}}},
                        {render: "#SmallInfoCard", permissions: {read: "reorderPoint"}, field: {name: "reorderPoint", widget: "#SmallInfoCard", label: "reorderPoint", widgetProps: {icon: "#IconAlertTriangle"}}},
                        {render: "#SmallInfoCard", permissions: {read: "reorderQuantity"}, field: {name: "reorderQuantity", widget: "#SmallInfoCard", label: "reorderQuantity", widgetProps: {icon: "#IconPackage"}}},
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
            render: "#SheetGroup",
            props: {title: "lifecycle", defaultOpen: true},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdAt"},
                            field: {
                                name: "createdAt",
                                widget: "#SmallInfoCard",
                                label: "createdAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "updatedAt"},
                            field: {
                                name: "updatedAt",
                                widget: "#SmallInfoCard",
                                label: "updatedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "createdBy"},
                            field: {
                                name: "createdBy",
                                widget: "#SmallInfoCard",
                                label: "createdBy",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "createdBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            dependent: "deletedAt",
                            permissions: {read: "deletedAt"},
                            field: {
                                name: "deletedAt",
                                widget: "#SmallInfoCard",
                                label: "deletedAt",
                                widgetProps: {icon: "#Calendar", format: "dateTime"},
                            },
                        },
                        {
                            render: "#SmallInfoCard",
                            dependent: "deletedBy",
                            permissions: {read: "deletedBy"},
                            field: {
                                name: "deletedBy",
                                widget: "#SmallInfoCard",
                                label: "deletedBy",
                                widgetProps: {
                                    icon: "#User",
                                    parent: "deletedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                },
                            },
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
