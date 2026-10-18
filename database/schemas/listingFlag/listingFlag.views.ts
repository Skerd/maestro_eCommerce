import type {ViewConfig} from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const listingFlagSheetView: ViewConfig = {
    model: "listingflags",
    viewType: "sheet",
    accessModel: "listingflags",
    apiUrl: "/api/eCommerceMarketplace/listingFlag",
    header: {
        titleField: "status",
        titleFieldLanguageCategory: "status_values",
        subtitleKey: "listingFlagSubtitle",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: {title: "overview"},
            children: [
                {
                    render: "#SheetGrid",
                    props: {columns: 2},
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: {read: "listing"},
                            field: {
                                name: "listing",
                                widget: "#DisplayCard",
                                label: "listing",
                                widgetProps: {
                                    icon: "#LayoutList",
                                    valuePath: ["listing.title"],
                                    linkedRefPath: "listing",
                                    linkedSheetModel: "listings",
                                    linkedSheetWidget: "#ListingSheetView",
                                    linkedSheetEntityProp: "listing",
                                    linkedSheetValueField: "title",
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
                                widgetProps: {icon: "#Tag", languageKeyCategory: "status_values", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "reason"},
                            field: {
                                name: "reason",
                                widget: "#DisplayCard",
                                label: "reason",
                                widgetProps: {icon: "#Flag", languageKeyCategory: "reason_values", type: "enum"},
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: {read: "user"},
                            field: {
                                name: "user",
                                widget: "#DisplayCard",
                                label: "user",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["user.name", "user.surname"],
                                    joinSeparator: " ",
                                    linkedRefPath: "user",
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
            props: {title: "comment"},
            dependent: "comment",
            permissions: {read: "comment"},
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "comment"},
                            field: {
                                name: "comment",
                                widget: "#ExpandableText",
                                label: "comment",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: {title: "resolution"},
            dependent: "resolution",
            permissions: {read: "resolution"},
            children: [
                {
                    render: "div",
                    props: {className: "p-2 rounded-lg bg-muted/30 border border-border/50"},
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: {read: "resolution"},
                            field: {
                                name: "resolution",
                                widget: "#ExpandableText",
                                label: "resolution",
                                widgetProps: {className: "text-sm"},
                            },
                        },
                    ],
                },
            ],
        },
        lifecycleSheetGroup,
    ],
};

export const listingFlagCreateFormView: ViewConfig = {
    model: "listingflags",
    viewType: "form",
    viewMode: "create",
    accessModel: "listingflags",
    apiUrl: "/api/eCommerceMarketplace/listingFlag",
    method: "PUT",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 1},
            children: [
                {
                    render: "#Field",
                    field: {
                        name: "listing",
                        widget: "#ApiSelect",
                        label: "form.listingLabel",
                        placeholder: "form.listingPlaceholder",
                        required: true,
                        widgetProps: {apiUrl: "/api/eCommerceMarketplace/listing/select"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "reason",
                        widget: "#SimpleSelect",
                        label: "form.reasonLabel",
                        placeholder: "form.reasonPlaceholder",
                        required: true,
                        widgetProps: {
                            options: [
                                {value: "inappropriate", label: "form.reason_values.inappropriate"},
                                {value: "spam", label: "form.reason_values.spam"},
                                {value: "misleading", label: "form.reason_values.misleading"},
                                {value: "other", label: "form.reason_values.other"},
                            ],
                        },
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "comment",
                        widget: "#Textarea",
                        label: "form.commentLabel",
                        placeholder: "form.commentPlaceholder",
                        widgetProps: {className: "min-h-[100px] max-h-[200px] resize-none overflow-y-auto"},
                    },
                },
            ],
        },
    ],
};

export const listingFlagEditFormView: ViewConfig = {
    model: "listingflags",
    viewType: "form",
    viewMode: "edit",
    accessModel: "listingflags",
    apiUrl: "/api/eCommerceMarketplace/listingFlag",
    method: "PATCH",
    nodes: [
        {
            render: "#FormGrid",
            props: {columns: 1},
            children: [
                {
                    render: "#Field",
                    field: {
                        name: "_id",
                        widget: "#Input",
                        required: true,
                        widgetProps: {type: "hidden"},
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "reason",
                        widget: "#SimpleSelect",
                        label: "form.reasonLabel",
                        placeholder: "form.reasonPlaceholder",
                        required: true,
                        widgetProps: {
                            options: [
                                {value: "inappropriate", label: "form.reason_values.inappropriate"},
                                {value: "spam", label: "form.reason_values.spam"},
                                {value: "misleading", label: "form.reason_values.misleading"},
                                {value: "other", label: "form.reason_values.other"},
                            ],
                        },
                    },
                },
                {
                    render: "#Field",
                    field: {
                        name: "comment",
                        widget: "#Textarea",
                        label: "form.commentLabel",
                        placeholder: "form.commentPlaceholder",
                        widgetProps: {className: "min-h-[100px] max-h-[200px] resize-none overflow-y-auto"},
                    },
                },
            ],
        },
    ],
};

export const listingFlagViews: ViewConfig[] = [
    listingFlagSheetView,
    listingFlagCreateFormView,
    listingFlagEditFormView,
];
