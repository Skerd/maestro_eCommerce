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
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {render: "#SmallInfoCard", field: {name: "warehouse.name", widget: "#SmallInfoCard", label: "warehouse", widgetProps: {icon: "#IconBuildingWarehouse"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityOnHand", widget: "#SmallInfoCard", label: "quantityOnHand", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityReserved", widget: "#SmallInfoCard", label: "quantityReserved", widgetProps: {icon: "#IconLock"}}},
                        {render: "#SmallInfoCard", field: {name: "quantityAvailable", widget: "#SmallInfoCard", label: "quantityAvailable", widgetProps: {icon: "#IconBox"}}},
                        {render: "#SmallInfoCard", field: {name: "reorderPoint", widget: "#SmallInfoCard", label: "reorderPoint", widgetProps: {icon: "#IconAlertTriangle"}}},
                        {render: "#SmallInfoCard", field: {name: "reorderQuantity", widget: "#SmallInfoCard", label: "reorderQuantity", widgetProps: {icon: "#IconPackage"}}},
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
