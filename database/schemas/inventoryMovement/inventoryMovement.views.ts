import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const inventoryMovementSheetView: ViewConfig = {
    model: "inventoryMovements",
    viewType: "sheet",
    accessModel: "inventoryMovements",
    apiUrl: "/api/eCommerce/inventoryMovement",
    header: {
        titleField: "reason",
        titleFieldLanguageCategory: "reasons",
        subtitleKey: "inventoryMovementSubtitle",
        showCloseButton: true,
    },
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
                            permissions: {read: "reason"},
                            field: {
                                name: "reason",
                                widget: "#DisplayCard",
                                label: "reason",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "reasons", type: "enum"},
                            },
                        },
                        {render: "#DisplayCard", permissions: {read: "quantity"}, field: {name: "quantity", widget: "#DisplayCard", label: "quantity", widgetProps: {icon: "#Hash"}}},
                        {render: "#DisplayCard", permissions: {read: "quantityBefore"}, field: {name: "quantityBefore", widget: "#DisplayCard", label: "quantityBefore", widgetProps: {icon: "#IconChevronLeft"}}},
                        {render: "#DisplayCard", permissions: {read: "quantityAfter"}, field: {name: "quantityAfter", widget: "#DisplayCard", label: "quantityAfter", widgetProps: {icon: "#IconChevronRight"}}},
                        {render: "#DisplayCard", permissions: {read: "occurredAt"}, field: {name: "occurredAt", widget: "#DisplayCard", label: "occurredAt", widgetProps: {icon: "#Calendar", format: "dateTime", type: "dateTime"}}},
                        {render: "#DisplayCard", permissions: {read: "manufacturer"}, field: {name: "manufacturer", widget: "#DisplayCard", label: "manufacturer", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#DisplayCard", permissions: {read: "receiptNumber"}, field: {name: "receiptNumber", widget: "#DisplayCard", label: "receiptNumber", widgetProps: {icon: "#IconReceipt"}}},
                        {render: "#DisplayCard", permissions: {read: "unitCost"}, field: {name: "unitCost", widget: "#DisplayCard", label: "unitCost", widgetProps: {icon: "#IconCurrencyDollar", type: "locale"}}},
                        {render: "#DisplayCard", permissions: {read: "batchLot"}, field: {name: "batchLot", widget: "#DisplayCard", label: "batchLot", widgetProps: {icon: "#IconTag"}}},
                        {render: "#DisplayCard", permissions: {read: "expiryDate"}, field: {name: "expiryDate", widget: "#DisplayCard", label: "expiryDate", widgetProps: {icon: "#Calendar", format: "date", type: "date"}}},
                        {
                            render: "#DisplayCard",
                            permissions: {read: "performedBy"},
                            field: {
                                name: "performedBy",
                                widget: "#DisplayCard",
                                label: "performedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "performedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
                                    type: "user",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "note", defaultOpen: true},
            dependent: "note",
            children: [
                {
                    render: "div",
                    props: {className: "p-4 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            field: {
                                name: "note",
                                widget: "#ExpandableText",
                                widgetProps: {className: "text-sm whitespace-pre-wrap"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "receipts", defaultOpen: true},
            dependent: "receipts",
            children: [
                {
                    render: "#SheetMediaFilesStrip",
                    field: {
                        name: "receipts",
                        widget: "#SheetMediaFilesStrip",
                        widgetProps: {canDownload: true, canRemove: false},
                    },
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
                            render: "#DisplayCard",
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

export const inventoryMovementViews: ViewConfig[] = [inventoryMovementSheetView];
