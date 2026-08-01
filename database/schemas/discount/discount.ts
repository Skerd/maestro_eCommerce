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
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {DiscountSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.schema-def";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {CustomerGroupSimpleSnippet} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {applyDiscountIndexes} from "./discount.indexes";
import {discountViews} from "./discount.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export type DiscountType = "percentage" | "fixed" | "free_shipping" | "buy_x_get_y";
export type DiscountAppliesTo = "order" | "product" | "collection" | "category";

/** Polymorphic by `appliesTo` — Mongoose stores ObjectIds without a single static `ref`. */
export type DiscountTargetRef = IProduct | ICollection | IProductCategory;

export interface IDiscountBuyXGetY {
    buyQuantity: number;
    getQuantity: number;
    getProductIds: IProduct[];
}

export interface IDiscount extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    type: DiscountType;
    title: string;
    code?: string;
    value: number;
    appliesTo: DiscountAppliesTo;
    targetIds?: DiscountTargetRef[];
    minimumOrderAmount?: number;
    minimumQuantity?: number;
    usageLimit?: number;
    usageLimitPerCustomer?: number;
    usageCount: number;
    customerGroups?: ICustomerGroup[];
    isActive: boolean;
    startsAt: Date;
    endsAt?: Date;
    buyXGetY?: IDiscountBuyXGetY;
    company: ICompany;
}

const DiscountSchema = new Schema<IDiscount>(
    {
        type: {
            type: SchemaTypes.String,
            enum: ["percentage", "fixed", "free_shipping", "buy_x_get_y"],
            required: true,
        },
        title: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        code: {
            type: SchemaTypes.String, 
            trim: true, 
            uppercase: true
        },
        value: {
            type: SchemaTypes.Number, 
            required: true, 
            min: 0
        },
        appliesTo: {
            type: SchemaTypes.String,
            enum: ["order", "product", "collection", "category"],
            required: true,
        },
        // Polymorphic by appliesTo — no single static ref.
        targetIds: {
            type: [{
                type: SchemaTypes.ObjectId
            }], 
            default: []
        },
        minimumOrderAmount: {
            type: SchemaTypes.Number, 
            min: 0
        },
        minimumQuantity: {
            type: SchemaTypes.Number, 
            min: 0
        },
        usageLimit: {
            type: SchemaTypes.Number,
            min: 0
        },
        usageLimitPerCustomer: {
            type: SchemaTypes.Number, 
            min: 0
        },
        usageCount: {
            type: SchemaTypes.Number, 
            default: 0, 
            min: 0
        },
        customerGroups: {
            type: [{
                type: SchemaTypes.ObjectId, 
                ref: "CustomerGroup", 
                refAllowlist: CustomerGroupSimpleSnippet
            }],
            default: [],
        },
        isActive: {
            type: SchemaTypes.Boolean, 
            default: true
        },
        startsAt: {
            type: SchemaTypes.Date, 
            required: true
        },
        endsAt: {
            type: SchemaTypes.Date
        },
        buyXGetY: {
            type: {
                buyQuantity: {
                    type: SchemaTypes.Number, 
                    required: true, 
                    min: 1
                },
                getQuantity: {
                    type: SchemaTypes.Number, 
                    required: true, 
                    min: 1
                },
                getProductIds: {
                    type: [{
                        type: SchemaTypes.ObjectId, 
                        ref: "Product", 
                        refAllowlist: ProductSimpleSnippet
                    }],
                    default: [],
                },
            },
            _id: false,
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(DiscountSchema);
auditPlugin(DiscountSchema);
softDeletePlugin(DiscountSchema);
applyDiscountIndexes(DiscountSchema);
lifeCyclePlugin(DiscountSchema);
const Discount = model<IDiscount>("Discount", DiscountSchema);
normalizeSchemaPermissions(Discount);
export default Discount;

addModelData(Discount, discountViews);
validateSchemaDefAgainstMongoose(DiscountSchema, DiscountSchemaDef, "Discount", ["usageCount"]);
