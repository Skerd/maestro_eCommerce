import {Document, model, Schema, SchemaTypes} from "mongoose";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {ILifeCyclePluginFields, IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import type {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {ShopSettingsSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/shopSettings/shopSettings.schema-def";
import {applyShopSettingsIndexes} from "./shopSettings.indexes";
import {shopSettingsViews} from "./shopSettings.views";

/** A shop's own eCommerce settings, one per company (P26.8). */
export interface IShopSettings extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    /** The top-level platform categories the shop sells in ("What we sell", D195). */
    branches: IProductCategory[];
}

const ShopSettingsSchema = new Schema<IShopSettings>(
    {
        branches: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductCategory",
            }],
            default: [],
            refAllowlist: CategorySimpleSnippet,
            dynamicTableConfiguration: {hideColumn: true},
        },
    },
    {
        accessMode: "loose",
        collection: "shopsettings",
    },
);

ownershipPlugin(ShopSettingsSchema);
auditPlugin(ShopSettingsSchema);
softDeletePlugin(ShopSettingsSchema);
lifeCyclePlugin(ShopSettingsSchema);
applyShopSettingsIndexes(ShopSettingsSchema);
const ShopSettings = model<IShopSettings>("ShopSettings", ShopSettingsSchema);
normalizeSchemaPermissions(ShopSettings);
export default ShopSettings;

addModelData(ShopSettings, shopSettingsViews);
validateSchemaDefAgainstMongoose(ShopSettingsSchema, ShopSettingsSchemaDef, "ShopSettings");
