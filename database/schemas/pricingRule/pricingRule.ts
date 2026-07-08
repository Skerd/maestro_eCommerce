import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {applyPricingRuleIndexes} from "./pricingRule.indexes";
import {pricingRuleViews} from "./pricingRule.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PricingRuleSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.schema-def";

export type PricingRuleType = "percentage_discount" | "fixed_discount" | "fixed_price" | "surcharge";
export type PricingRuleAppliesTo = "all" | "product" | "category" | "collection" | "customer_group";

export interface IPricingRule extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    type: PricingRuleType;
    value: number;
    appliesTo: PricingRuleAppliesTo;
    targetIds: Schema.Types.ObjectId[];
    customerGroups: Schema.Types.ObjectId[];
    minimumOrderAmount?: number;
    minimumQuantity?: number;
    priority: number;
    isActive: boolean;
    startsAt?: Date;
    endsAt?: Date;
    company: ICompany;
}

const PricingRuleSchema = new Schema<IPricingRule>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        type: {
            type: SchemaTypes.String,
            enum: ["percentage_discount", "fixed_discount", "fixed_price", "surcharge"],
            required: true,
        },
        value: {type: SchemaTypes.Number, required: true, min: 0},
        appliesTo: {
            type: SchemaTypes.String,
            enum: ["all", "product", "category", "collection", "customer_group"],
            required: true,
        },
        targetIds: {type: [{type: SchemaTypes.ObjectId}], default: []},
        customerGroups: {type: [{type: SchemaTypes.ObjectId}], default: []},
        minimumOrderAmount: {type: SchemaTypes.Number, min: 0},
        minimumQuantity: {type: SchemaTypes.Number, min: 0},
        priority: {type: SchemaTypes.Number, default: 0},
        isActive: {type: SchemaTypes.Boolean, default: true},
        startsAt: {type: SchemaTypes.Date},
        endsAt: {type: SchemaTypes.Date},
    },
    {accessMode: "loose"},
);

ownershipPlugin(PricingRuleSchema);
auditPlugin(PricingRuleSchema);
softDeletePlugin(PricingRuleSchema);
applyPricingRuleIndexes(PricingRuleSchema);
const PricingRule = model<IPricingRule>("PricingRule", PricingRuleSchema);
normalizeSchemaPermissions(PricingRule);
export default PricingRule;

addModelData(PricingRule, pricingRuleViews);
validateSchemaDefAgainstMongoose(PricingRuleSchema, PricingRuleSchemaDef, "PricingRule");
