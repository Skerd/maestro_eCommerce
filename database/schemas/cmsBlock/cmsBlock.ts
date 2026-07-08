import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CmsBlockSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/cmsBlock/cmsBlock.schema-def";
import {applyCmsBlockIndexes} from "./cmsBlock.indexes";
import {cmsBlockViews} from "./cmsBlock.views";

export type CmsBlockType =
    | "hero_banner" | "slider" | "featured_collection" | "trending"
    | "best_sellers" | "flash_sale" | "announcement_bar" | "custom_html"
    | "video" | "grid" | "category_showcase" | "promotional_section";

export interface ICmsBlock extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    type: CmsBlockType;
    title: string;
    isActive: boolean;
    position: number;
    config: Record<string, unknown>;
    startsAt?: Date;
    endsAt?: Date;
    visibility?: {devices?: ("desktop" | "mobile" | "tablet")[]; regions?: string[]};
    abTestVariant?: string;
    company: ICompany;
}

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
        title: {type: SchemaTypes.String, required: true, trim: true},
        isActive: {type: SchemaTypes.Boolean, default: true},
        position: {type: SchemaTypes.Number, default: 0},
        config: {type: SchemaTypes.Mixed, default: {}},
        startsAt: {type: SchemaTypes.Date},
        endsAt: {type: SchemaTypes.Date},
        visibility: {
            type: {
                devices: {type: [SchemaTypes.String], default: ["desktop", "mobile", "tablet"]},
                regions: {type: [SchemaTypes.String], default: []},
            },
            _id: false,
        },
        abTestVariant: {type: SchemaTypes.String},
    },
    {accessMode: "loose"},
);

ownershipPlugin(CmsBlockSchema);
auditPlugin(CmsBlockSchema);
softDeletePlugin(CmsBlockSchema);
applyCmsBlockIndexes(CmsBlockSchema);
const CmsBlock = model<ICmsBlock>("CmsBlock", CmsBlockSchema);
normalizeSchemaPermissions(CmsBlock);
export default CmsBlock;

addModelData(CmsBlock, cmsBlockViews);
validateSchemaDefAgainstMongoose(CmsBlockSchema, CmsBlockSchemaDef, "CmsBlock", ["config"]);
