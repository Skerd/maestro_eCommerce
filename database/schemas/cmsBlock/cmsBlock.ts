import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    CMS_BLOCK_CTA_LABEL_MAX,
    CMS_BLOCK_DEVICE_MAX,
    CMS_BLOCK_HEADLINE_MAX,
    CMS_BLOCK_HTML_MAX,
    CMS_BLOCK_MESSAGE_MAX,
    CMS_BLOCK_REGION_MAX,
    CMS_BLOCK_SUBHEADLINE_MAX,
    CMS_BLOCK_TITLE_MAX,
    CMS_BLOCK_URL_MAX,
    CmsBlockSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.schema-def";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import type {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {CollectionSimpleSnippet} from "@eCommerceModule/database/schemas/collection/collection.snippets";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {applyCmsBlockIndexes} from "./cmsBlock.indexes";
import {cmsBlockViews} from "./cmsBlock.views";

export type CmsBlockType =
    | "hero_banner" | "slider" | "featured_collection" | "trending"
    | "best_sellers" | "flash_sale" | "announcement_bar" | "custom_html"
    | "video" | "grid" | "category_showcase" | "promotional_section";

export interface ICmsBlockSlide {
    headline: string;
    subheadline?: string;
    imageUrl: string;
    ctaLabel?: string;
    ctaHref?: string;
}

export interface ICmsBlockGridItem {
    title?: string;
    imageUrl?: string;
    href?: string;
}

export interface ICmsBlockConfig {
    headline?: string;
    subheadline?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaHref?: string;
    message?: string;
    linkHref?: string;
    html?: string;
    url?: string;
    collectionId?: Types.ObjectId | ICollection;
    categoryIds?: (Types.ObjectId | IProductCategory)[];
    limit?: number;
    slides?: ICmsBlockSlide[];
    items?: ICmsBlockGridItem[];
}

export interface ICmsBlock extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    type: CmsBlockType;
    title: string;
    isActive: boolean;
    position: number;
    config: ICmsBlockConfig;
    startsAt?: Date;
    endsAt?: Date;
    visibility?: {devices?: ("desktop" | "mobile" | "tablet")[]; regions?: string[]};
}

const HideFromTable = {hideColumn: true} as const;

const CmsBlockSlideSchema = {
    headline: {type: SchemaTypes.String, required: true, trim: true, maxlength: CMS_BLOCK_HEADLINE_MAX, dynamicTableConfiguration: HideFromTable},
    subheadline: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_SUBHEADLINE_MAX, dynamicTableConfiguration: HideFromTable},
    imageUrl: {type: SchemaTypes.String, required: true, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
    ctaLabel: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_CTA_LABEL_MAX, dynamicTableConfiguration: HideFromTable},
    ctaHref: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
};

const CmsBlockGridItemSchema = {
    title: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_TITLE_MAX, dynamicTableConfiguration: HideFromTable},
    imageUrl: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
    href: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
};

const CmsBlockSchema = new Schema<ICmsBlock>(
    {
        type: {
            type: SchemaTypes.String,
            enum: [
                "hero_banner", "slider", "featured_collection", "trending",
                "best_sellers", "flash_sale", "announcement_bar", "custom_html",
                "video", "grid", "category_showcase", "promotional_section",
            ],
            required: true,
        },
        title: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: CMS_BLOCK_TITLE_MAX,
        },
        isActive: {
            type: SchemaTypes.Boolean,
            default: false,
        },
        position: {
            type: SchemaTypes.Number,
            default: 0,
        },
        config: {
            type: {
                headline: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_HEADLINE_MAX, dynamicTableConfiguration: HideFromTable},
                subheadline: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_SUBHEADLINE_MAX, dynamicTableConfiguration: HideFromTable},
                imageUrl: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
                ctaLabel: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_CTA_LABEL_MAX, dynamicTableConfiguration: HideFromTable},
                ctaHref: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
                message: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_MESSAGE_MAX, dynamicTableConfiguration: HideFromTable},
                linkHref: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
                html: {type: SchemaTypes.String, maxlength: CMS_BLOCK_HTML_MAX, dynamicTableConfiguration: HideFromTable},
                url: {type: SchemaTypes.String, trim: true, maxlength: CMS_BLOCK_URL_MAX, dynamicTableConfiguration: HideFromTable},
                collectionId: {
                    type: SchemaTypes.ObjectId,
                    ref: "ProductCollection",
                    refAllowlist: CollectionSimpleSnippet,
                    dynamicTableConfiguration: HideFromTable,
                },
                categoryIds: {
                    type: [{
                        type: SchemaTypes.ObjectId,
                        ref: "ProductCategory",
                        refAllowlist: CategorySimpleSnippet,
                    }],
                    dynamicTableConfiguration: HideFromTable,
                },
                limit: {type: SchemaTypes.Number, min: 1, max: 24, dynamicTableConfiguration: HideFromTable},
                slides: {
                    type: [{
                        _id: false,
                        ...CmsBlockSlideSchema,
                    }],
                    dynamicTableConfiguration: HideFromTable,
                },
                items: {
                    type: [{
                        _id: false,
                        ...CmsBlockGridItemSchema,
                    }],
                    dynamicTableConfiguration: HideFromTable,
                },
            },
            default: {},
            dynamicTableConfiguration: HideFromTable,
            _id: false,
        },
        startsAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        endsAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        visibility: {
            type: {
                devices: {
                    type: [{
                        type: SchemaTypes.String,
                        trim: true,
                        maxlength: CMS_BLOCK_DEVICE_MAX,
                    }],
                    default: ["desktop", "mobile", "tablet"],
                },
                regions: {
                    type: [{
                        type: SchemaTypes.String,
                        trim: true,
                        maxlength: CMS_BLOCK_REGION_MAX,
                    }],
                    default: [],
                },
            },
            _id: false,
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(CmsBlockSchema);
auditPlugin(CmsBlockSchema);
softDeletePlugin(CmsBlockSchema);
applyCmsBlockIndexes(CmsBlockSchema);
lifeCyclePlugin(CmsBlockSchema);
const CmsBlock = model<ICmsBlock>("CmsBlock", CmsBlockSchema);
normalizeSchemaPermissions(CmsBlock);
export default CmsBlock;

addModelData(CmsBlock, cmsBlockViews);
validateSchemaDefAgainstMongoose(CmsBlockSchema, CmsBlockSchemaDef, "CmsBlock");
