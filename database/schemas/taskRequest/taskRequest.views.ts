import type { ViewConfig } from "armonia/src/modules/core/api/auxiliary/private/viewConfig";
import {lifecycleSheetGroup} from "@coreModule/database/schemas/shared/lifecycleSheetGroup";

export const taskRequestSheetView: ViewConfig = {
    model: "taskrequests",
    viewType: "sheet",
    accessModel: "taskRequests",
    apiUrl: "/api/eCommerceMarketplace/taskRequest",
    header: {
        titleField: "title",
        subtitleKey: "taskRequest",
        showCloseButton: true,
    },
    nodes: [
        {
            render: "#SheetGroup",
            props: { title: "section.generalInfo" },
            children: [
                {
                    render: "#SheetGrid",
                    props: { columns: 2 },
                    children: [
                        {
                            render: "#DisplayCard",
                            permissions: { read: "category" },
                            field: {
                                name: "category",
                                widget: "#DisplayCard",
                                label: "category",
                                widgetProps: {
                                    icon: "#Folder",
                                    valuePath: ["category.name"],
                                    linkedRefPath: "category",
                                    linkedSheetModel: "listingCategories",
                                    linkedSheetWidget: "#CategorySheetView",
                                    linkedSheetEntityProp: "category",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: { read: "requester" },
                            field: {
                                name: "requester",
                                widget: "#DisplayCard",
                                label: "requester",
                                widgetProps: {
                                    icon: "#User",
                                    valuePath: ["requester.name", "requester.surname"],
                                    joinSeparator: " ",
                                    linkedRefPath: "requester",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: { read: "budgetMin" },
                            field: {
                                name: "budgetMin",
                                widget: "#DisplayCard",
                                label: "budgetMin",
                                widgetProps: {
                                    icon: "#DollarSign",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "budgetMin"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: { read: "budgetMax" },
                            field: {
                                name: "budgetMax",
                                widget: "#DisplayCard",
                                label: "budgetMax",
                                widgetProps: {
                                    icon: "#DollarSign",
                                    format: "locale",
                                    valuePath: ["currency.symbol", "budgetMax"],
                                    joinSeparator: " ",
                                    type: "currency",
                                    linkedRefPath: "currency",
                                    linkedSheetModel: "currencies",
                                    linkedSheetWidget: "#CurrencySheetView",
                                    linkedSheetEntityProp: "currency",
                                },
                            },
                        },
                        {
                            render: "#DisplayCard",
                            permissions: { read: "expiresAt" },
                            field: {
                                name: "expiresAt",
                                widget: "#DisplayCard",
                                label: "expiresAt",
                                widgetProps: { icon: "#Calendar", format: "date", type: "date" },
                            },
                        },
                    ],
                },
            ],
        },

        {
            render: "#SheetGroup",
            dependent: "description",
            props: { title: "description" },
            children: [
                {
                    render: "div",
                    props: { className: "p-2 rounded-lg bg-muted/30 border border-border/50" },
                    children: [
                        {
                            render: "#ExpandableText",
                            permissions: { read: "description" },
                            field: {
                                name: "description",
                                widget: "#ExpandableText",
                                widgetProps: { className: "text-sm" },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: { title: "gallery" },
            permissions: { read: "mainImage" },
            children: [
                {
                    render: "div",
                    props: { className: "max-w-full" },
                    children: [
                        {
                            render: "#GalleryCarousel",
                            permissions: { read: "mainImage" },
                            field: {
                                name: "mainImage",
                                widget: "#GalleryCarousel",
                                widgetProps: {
                                    imageGalleryField: "imageGallery",
                                    videoGalleryField: "videoGallery",
                                    showThumbnails: false,
                                    allowFullScreen: false,
                                    coverAfterFirst: false,
                                    showPreviews: true,
                                    previewLocation: "right",
                                },
                            },
                        },
                    ],
                },
            ],
        },
        {
            render: "#SheetGroup",
            props: { title: "address" },
            children: [
                {
                    render: "div",
                    props: { className: "space-y-2" },
                    children: [
                        {
                            render: "#SheetGrid",
                            props: { columns: 3 },
                            children: [
                                {
                                    render: "#DisplayCard",
                                    permissions: { read: "address" },
                                    field: {
                                        name: "address.country.name",
                                        widget: "#DisplayCard",
                                        label: "country",
                                        widgetProps: {
                                            icon: "#Globe",
                                            flagCodePath: "address.country.code",
                                            linkedRefPath: "address.country",
                                            linkedSheetModel: "countries",
                                            linkedSheetWidget: "#CountrySheetView",
                                            linkedSheetEntityProp: "country",
                                        },
                                    },
                                },
                                {
                                    render: "#DisplayCard",
                                    dependent: "address.state",
                                    dependentRuntimeOnly: true,
                                    permissions: { read: "address" },
                                    field: {
                                        name: "address.state.name",
                                        widget: "#DisplayCard",
                                        label: "state",
                                        widgetProps: {
                                            icon: "#MapPin",
                                            linkedRefPath: "address.state",
                                            linkedSheetModel: "states",
                                            linkedSheetWidget: "#StateSheetView",
                                            linkedSheetEntityProp: "state",
                                        },
                                    },
                                },
                                {
                                    render: "#DisplayCard",
                                    permissions: { read: "address" },
                                    field: {
                                        name: "address.city.name",
                                        widget: "#DisplayCard",
                                        label: "city",
                                        widgetProps: {
                                            icon: "#Building",
                                            linkedRefPath: "address.city",
                                            linkedSheetModel: "cities",
                                            linkedSheetWidget: "#CitySheetView",
                                            linkedSheetEntityProp: "city",
                                        },
                                    },
                                },
                            ],
                        },
                        {
                            render: "#SheetGrid",
                            props: { columns: 2 },
                            children: [
                                {
                                    render: "#DisplayCard",
                                    permissions: { read: "address" },
                                    field: {
                                        name: "address.street",
                                        widget: "#DisplayCard",
                                        label: "street",
                                        widgetProps: { icon: "#MapPin" },
                                    },
                                },
                                {
                                    render: "#DisplayCard",
                                    permissions: { read: "address" },
                                    field: {
                                        name: "address.postalCode",
                                        widget: "#DisplayCard",
                                        label: "postalCode",
                                        widgetProps: { icon: "#Mail" },
                                    },
                                },
                            ],
                        },
                        {
                            render: "div",
                            props: { className: "w-full pt-2" },
                            children: [
                                {
                                    render: "#SheetLocationMap",
                                    permissions: { read: "address" },
                                    field: {
                                        name: "address",
                                        widget: "#SheetLocationMap",
                                        widgetProps: {
                                            latitudeField: "address.latitude",
                                            longitudeField: "address.longitude",
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

// Separate create and edit trees (VC-02): edit carries the field ACL; create carries none.
const taskRequestCreateFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.general"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        field: {name: "title", widget: "#Input", label: "form.titleLabel", placeholder: "form.titlePlaceholder", required: true},
                    },
                    {
                        render: "#Field",
                        field: {name: "category", widget: "#ApiSelect", label: "form.categoryLabel", placeholder: "form.categoryPlaceholder", required: true, widgetProps: {apiUrl: "/api/eCommerceMarketplace/listingCategory/select"}},
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", placeholder: "form.descriptionPlaceholder", widgetProps: {className: "resize-none max-h-[250px] overflow-y-auto"}},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.budget"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        field: {name: "currency", widget: "#ApiSelect", label: "form.currencyLabel", placeholder: "form.currencyPlaceholder", description: "form.currencyDescription", required: true, widgetProps: {apiUrl: "/api/finance/currency/select"}},
                    },
                    {
                        render: "#Field",
                        field: {name: "budgetMin", widget: "#Input", label: "form.budgetMinLabel", placeholder: "form.budgetMinPlaceholder", required: true, widgetProps: {type: "number", min: 0, step: "any"}},
                    },
                    {
                        render: "#Field",
                        field: {name: "budgetMax", widget: "#Input", label: "form.budgetMaxLabel", placeholder: "form.budgetMaxPlaceholder", required: true, widgetProps: {type: "number", min: 0, step: "any"}},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.address"},
        children: [
            {
                render: "div",
                props: {className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"},
                children: [
                    {
                        render: "div",
                        props: {className: "lg:col-span-2 space-y-6 min-w-0"},
                        children: [
                            {
                                render: "#FormGrid",
                                props: {columns: 3, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.country",
                                            widget: "#ApiSelect",
                                            label: "form.countryLabel",
                                            placeholder: "form.countryPlaceholder",
                                            required: true,
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/country/select",
                                                method: "POST",
                                                pageSize: 50,
                                                cascadeClearFormFields: ["address.state", "address.city"],
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.state",
                                            widget: "#ApiSelect",
                                            label: "form.stateLabel",
                                            placeholder: "form.statePlaceholder",
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/state/select",
                                                method: "POST",
                                                pageSize: 50,
                                                postBodyFromFormFields: [{field: "address.country", paramName: "country"}],
                                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                                cascadeClearFormFields: ["address.city"],
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        field: {
                                            name: "address.city",
                                            widget: "#ApiSelect",
                                            label: "form.cityLabel",
                                            placeholder: "form.cityPlaceholder",
                                            required: true,
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/city/select",
                                                method: "POST",
                                                pageSize: 50,
                                                postBodyFromFormFields: [
                                                    {field: "address.country", paramName: "country"},
                                                    {field: "address.state", paramName: "state"},
                                                ],
                                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                            },
                                        },
                                    },
                                ],
                            },
                            {
                                render: "#FormGrid",
                                props: {columns: 2, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {name: "address.street", widget: "#Input", label: "form.streetLabel", placeholder: "form.streetPlaceholder", required: true},
                                    },
                                    {
                                        render: "#Field",
                                        field: {name: "address.postalCode", widget: "#Input", label: "form.postalCodeLabel", placeholder: "form.postalCodePlaceholder", required: true},
                                    },
                                ],
                            },
                            {
                                // The pin fills these; typing stays possible because they are required and a missing pin must show its error.
                                render: "#FormGrid",
                                props: {columns: 2, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        field: {name: "address.latitude", widget: "#Input", label: "form.latitudeLabel", placeholder: "form.latitudePlaceholder", required: true, widgetProps: {type: "number", step: "0.000001"}},
                                    },
                                    {
                                        render: "#Field",
                                        field: {name: "address.longitude", widget: "#Input", label: "form.longitudeLabel", placeholder: "form.longitudePlaceholder", required: true, widgetProps: {type: "number", step: "0.000001"}},
                                    },
                                ],
                            },
                            {render: "#FormAlert", props: {message: "form.addressPrivacyAlert"}},
                        ],
                    },
                    {
                        render: "div",
                        props: {className: "flex flex-col lg:col-span-1 w-full min-h-[220px] h-[220px] lg:h-full lg:min-h-[220px]"},
                        children: [
                        {
                            render: "#Field",
                            field: {
                                    name: "_addressMap",
                                    widget: "#FormMapPinPicker",
                                    skipWriteAccessGate: true,
                                    widgetProps: {fieldPrefix: "address", latField: "latitude", lngField: "longitude"},
                                },
                        },
                        ],
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.images"},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel", required: true, widgetProps: {mediaType: "image", mode: "single"}},
                    },
                    {
                        render: "#Field",
                        field: {name: "imageGallery", widget: "#MediaField", label: "form.imageGalleryLabel", widgetProps: {mediaType: "image", mode: "multiple", maxCount: 8}},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.video", defaultOpen: false},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        field: {name: "videoGallery", widget: "#MediaField", label: "form.videoGalleryLabel", widgetProps: {mediaType: "video", mode: "multiple", maxCount: 3}},
                    },
                ],
            },
        ],
    },
];

const taskRequestEditFormNodes: ViewConfig["nodes"] = [
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.general"},
        permissions: {readAny: ["title", "category", "description"], writeAny: ["title", "category", "description"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 2},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "title", write: "title"},
                        field: {name: "title", widget: "#Input", label: "form.titleLabel", placeholder: "form.titlePlaceholder", required: true},
                    },
                    {
                        render: "#Field",
                        permissions: {read: "category", write: "category"},
                        field: {name: "category", widget: "#ApiSelect", label: "form.categoryLabel", placeholder: "form.categoryPlaceholder", required: true, widgetProps: {apiUrl: "/api/eCommerceMarketplace/listingCategory/select"}},
                    },
                ],
            },
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "description", write: "description"},
                        field: {name: "description", widget: "#Textarea", label: "form.descriptionLabel", placeholder: "form.descriptionPlaceholder", widgetProps: {className: "resize-none max-h-[250px] overflow-y-auto"}},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.budget"},
        permissions: {readAny: ["currency", "budgetMin", "budgetMax"], writeAny: ["currency", "budgetMin", "budgetMax"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 3},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "currency", write: "currency"},
                        field: {name: "currency", widget: "#ApiSelect", label: "form.currencyLabel", placeholder: "form.currencyPlaceholder", description: "form.currencyDescription", required: true, widgetProps: {apiUrl: "/api/finance/currency/select"}},
                    },
                    {
                        render: "#Field",
                        permissions: {read: "budgetMin", write: "budgetMin"},
                        field: {name: "budgetMin", widget: "#Input", label: "form.budgetMinLabel", placeholder: "form.budgetMinPlaceholder", required: true, widgetProps: {type: "number", min: 0, step: "any"}},
                    },
                    {
                        render: "#Field",
                        permissions: {read: "budgetMax", write: "budgetMax"},
                        field: {name: "budgetMax", widget: "#Input", label: "form.budgetMaxLabel", placeholder: "form.budgetMaxPlaceholder", required: true, widgetProps: {type: "number", min: 0, step: "any"}},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.address"},
        permissions: {readAny: ["address"], writeAny: ["address"]},
        children: [
            {
                render: "div",
                props: {className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"},
                children: [
                    {
                        render: "div",
                        props: {className: "lg:col-span-2 space-y-6 min-w-0"},
                        children: [
                            {
                                render: "#FormGrid",
                                props: {columns: 3, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {
                                            name: "address.country",
                                            widget: "#ApiSelect",
                                            label: "form.countryLabel",
                                            placeholder: "form.countryPlaceholder",
                                            required: true,
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/country/select",
                                                method: "POST",
                                                pageSize: 50,
                                                cascadeClearFormFields: ["address.state", "address.city"],
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {
                                            name: "address.state",
                                            widget: "#ApiSelect",
                                            label: "form.stateLabel",
                                            placeholder: "form.statePlaceholder",
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/state/select",
                                                method: "POST",
                                                pageSize: 50,
                                                postBodyFromFormFields: [{field: "address.country", paramName: "country"}],
                                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                                cascadeClearFormFields: ["address.city"],
                                            },
                                        },
                                    },
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {
                                            name: "address.city",
                                            widget: "#ApiSelect",
                                            label: "form.cityLabel",
                                            placeholder: "form.cityPlaceholder",
                                            required: true,
                                            widgetProps: {
                                                apiUrl: "/api/auxiliary/city/select",
                                                method: "POST",
                                                pageSize: 50,
                                                postBodyFromFormFields: [
                                                    {field: "address.country", paramName: "country"},
                                                    {field: "address.state", paramName: "state"},
                                                ],
                                                enableWhenFormFieldsNonEmpty: ["address.country"],
                                            },
                                        },
                                    },
                                ],
                            },
                            {
                                render: "#FormGrid",
                                props: {columns: 2, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {name: "address.street", widget: "#Input", label: "form.streetLabel", placeholder: "form.streetPlaceholder", required: true},
                                    },
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {name: "address.postalCode", widget: "#Input", label: "form.postalCodeLabel", placeholder: "form.postalCodePlaceholder", required: true},
                                    },
                                ],
                            },
                            {
                                // The pin fills these; typing stays possible because they are required and a missing pin must show its error.
                                render: "#FormGrid",
                                props: {columns: 2, className: "gap-6"},
                                children: [
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {name: "address.latitude", widget: "#Input", label: "form.latitudeLabel", placeholder: "form.latitudePlaceholder", required: true, widgetProps: {type: "number", step: "0.000001"}},
                                    },
                                    {
                                        render: "#Field",
                                        permissions: {read: "address", write: "address"},
                                        field: {name: "address.longitude", widget: "#Input", label: "form.longitudeLabel", placeholder: "form.longitudePlaceholder", required: true, widgetProps: {type: "number", step: "0.000001"}},
                                    },
                                ],
                            },
                            {render: "#FormAlert", props: {message: "form.addressPrivacyAlert"}},
                        ],
                    },
                    {
                        render: "div",
                        props: {className: "flex flex-col lg:col-span-1 w-full min-h-[220px] h-[220px] lg:h-full lg:min-h-[220px]"},
                        children: [
                        {
                            render: "#Field",
                            permissions: {read: "address", write: "address"},
                            field: {
                                    name: "_addressMap",
                                    widget: "#FormMapPinPicker",
                                    skipWriteAccessGate: true,
                                    widgetProps: {fieldPrefix: "address", latField: "latitude", lngField: "longitude"},
                                },
                        },
                        ],
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.images"},
        permissions: {readAny: ["mainImage", "imageGallery"], writeAny: ["mainImage", "imageGallery"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "mainImage", write: "mainImage"},
                        field: {name: "mainImage", widget: "#MediaField", label: "form.mainImageLabel", required: true, widgetProps: {mediaType: "image", mode: "single"}},
                    },
                    {
                        render: "#Field",
                        permissions: {read: "imageGallery", write: "imageGallery"},
                        field: {name: "imageGallery", widget: "#MediaField", label: "form.imageGalleryLabel", widgetProps: {mediaType: "image", mode: "multiple", maxCount: 8}},
                    },
                ],
            },
        ],
    },
    {
        render: "#TitleWithCollapse",
        props: {title: "form.section.video", defaultOpen: false},
        permissions: {readAny: ["videoGallery"], writeAny: ["videoGallery"]},
        children: [
            {
                render: "#FormGrid",
                props: {columns: 1},
                children: [
                    {
                        render: "#Field",
                        permissions: {read: "videoGallery", write: "videoGallery"},
                        field: {name: "videoGallery", widget: "#MediaField", label: "form.videoGalleryLabel", widgetProps: {mediaType: "video", mode: "multiple", maxCount: 3}},
                    },
                ],
            },
        ],
    },
];

export const taskRequestCreateFormView: ViewConfig = {
    model: "taskrequests",
    viewType: "form",
    viewMode: "create",
    accessModel: "taskRequests",
    apiUrl: "/api/eCommerceMarketplace/taskRequest",
    method: "PUT",
    nodes: taskRequestCreateFormNodes,
};

export const taskRequestEditFormView: ViewConfig = {
    model: "taskrequests",
    viewType: "form",
    viewMode: "edit",
    accessModel: "taskRequests",
    apiUrl: "/api/eCommerceMarketplace/taskRequest",
    method: "PATCH",
    nodes: taskRequestEditFormNodes,
};

export const taskRequestViews: ViewConfig[] = [taskRequestSheetView, taskRequestCreateFormView, taskRequestEditFormView];
