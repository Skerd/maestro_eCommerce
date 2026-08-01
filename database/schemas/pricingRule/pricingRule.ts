import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {applyPricingRuleIndexes} from "./pricingRule.indexes";
import {pricingRuleViews} from "./pricingRule.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PricingRuleSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/pricingRule/pricingRule.schema-def";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {CustomerGroupSimpleSnippet} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.snippets";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export type PricingRuleType = "percentage_discount" | "fixed_discount" | "fixed_price" | "surcharge";
export type PricingRuleAppliesTo = "all" | "product" | "category" | "collection" | "customer_group";

/** Polymorphic by `appliesTo` — Mongoose stores ObjectIds without a single static `ref`. */
export type PricingRuleTargetRef = IProduct | ICollection | IProductCategory;

export interface IPricingRule extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    type: PricingRuleType;
    value: number;
    appliesTo: PricingRuleAppliesTo;
    targetIds: PricingRuleTargetRef[];
    customerGroups: ICustomerGroup[];
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
        name: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        type: {
            type: SchemaTypes.String,
            enum: ["percentage_discount", "fixed_discount", "fixed_price", "surcharge"],
            required: true,
        },
        value: {
            type: SchemaTypes.Number, 
            required: true, 
            min: 0
        },
        appliesTo: {
            type: SchemaTypes.String,
            enum: ["all", "product", "category", "collection", "customer_group"],
            required: true,
        },
        // Polymorphic by appliesTo — no single static ref.
        targetIds: {
            type: [{type: SchemaTypes.ObjectId}],
            default: []
        },
        customerGroups: {
            type: [{
                type: SchemaTypes.ObjectId, 
                ref: "CustomerGroup", 
                refAllowlist: CustomerGroupSimpleSnippet
            }],
            default: [],
        },
        minimumOrderAmount: {
            type: SchemaTypes.Number, 
            min: 0
        },
        minimumQuantity: {
            type: SchemaTypes.Number, 
            min: 0
        },
        priority: {
            type: SchemaTypes.Number, 
            default: 0
        },
        isActive: {
            type: SchemaTypes.Boolean, 
            default: true
        },
        startsAt: {
            type: SchemaTypes.Date
        },
        endsAt: {
            type: SchemaTypes.Date
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(PricingRuleSchema);
auditPlugin(PricingRuleSchema);
softDeletePlugin(PricingRuleSchema);
applyPricingRuleIndexes(PricingRuleSchema);
lifeCyclePlugin(PricingRuleSchema);
const PricingRule = model<IPricingRule>("PricingRule", PricingRuleSchema);
normalizeSchemaPermissions(PricingRule);
export default PricingRule;

addModelData(PricingRule, pricingRuleViews);
validateSchemaDefAgainstMongoose(PricingRuleSchema, PricingRuleSchemaDef, "PricingRule");
