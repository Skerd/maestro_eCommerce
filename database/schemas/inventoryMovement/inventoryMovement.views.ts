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
                            render: "#SmallInfoCard",
                            permissions: {read: "reason"},
                            field: {
                                name: "reason",
                                widget: "#SmallInfoCard",
                                label: "reason",
                                widgetProps: {icon: "#Tag", languageKeyCategory: "reasons"},
                            },
                        },
                        {render: "#SmallInfoCard", permissions: {read: "quantity"}, field: {name: "quantity", widget: "#SmallInfoCard", label: "quantity", widgetProps: {icon: "#Hash"}}},
                        {render: "#SmallInfoCard", permissions: {read: "quantityBefore"}, field: {name: "quantityBefore", widget: "#SmallInfoCard", label: "quantityBefore", widgetProps: {icon: "#IconChevronLeft"}}},
                        {render: "#SmallInfoCard", permissions: {read: "quantityAfter"}, field: {name: "quantityAfter", widget: "#SmallInfoCard", label: "quantityAfter", widgetProps: {icon: "#IconChevronRight"}}},
                        {render: "#SmallInfoCard", permissions: {read: "occurredAt"}, field: {name: "occurredAt", widget: "#SmallInfoCard", label: "occurredAt", widgetProps: {icon: "#Calendar", format: "dateTime"}}},
                        {render: "#SmallInfoCard", permissions: {read: "manufacturer"}, field: {name: "manufacturer", widget: "#SmallInfoCard", label: "manufacturer", widgetProps: {icon: "#IconBuilding"}}},
                        {render: "#SmallInfoCard", permissions: {read: "receiptNumber"}, field: {name: "receiptNumber", widget: "#SmallInfoCard", label: "receiptNumber", widgetProps: {icon: "#IconReceipt"}}},
                        {render: "#SmallInfoCard", permissions: {read: "unitCost"}, field: {name: "unitCost", widget: "#SmallInfoCard", label: "unitCost", widgetProps: {icon: "#IconCurrencyDollar"}}},
                        {render: "#SmallInfoCard", permissions: {read: "batchLot"}, field: {name: "batchLot", widget: "#SmallInfoCard", label: "batchLot", widgetProps: {icon: "#IconTag"}}},
                        {render: "#SmallInfoCard", permissions: {read: "expiryDate"}, field: {name: "expiryDate", widget: "#SmallInfoCard", label: "expiryDate", widgetProps: {icon: "#Calendar", format: "date"}}},
                        {
                            render: "#SmallInfoCard",
                            permissions: {read: "performedBy"},
                            field: {
                                name: "performedBy",
                                widget: "#SmallInfoCard",
                                label: "performedBy",
                                widgetProps: {
                                    icon: "#IconUser",
                                    parent: "performedBy",
                                    valuePath: ["name", "surname"],
                                    joinSeparator: " ",
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
        lifecycleSheetGroup,
    ],
};

export const inventoryMovementViews: ViewConfig[] = [inventoryMovementSheetView];
