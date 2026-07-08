import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {DiscountSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/discount/discount.schema-def";
import {applyDiscountIndexes} from "./discount.indexes";
import {discountViews} from "./discount.views";

export type DiscountType = "percentage" | "fixed" | "free_shipping" | "buy_x_get_y";
export type DiscountAppliesTo = "order" | "product" | "collection" | "category";

export interface IDiscount extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    type: DiscountType;
    title: string;
    code?: string;
    value: number;
    appliesTo: DiscountAppliesTo;
    targetIds?: Schema.Types.ObjectId[];
    minimumOrderAmount?: number;
    minimumQuantity?: number;
    usageLimit?: number;
    usageLimitPerCustomer?: number;
    usageCount: number;
    customerGroups?: Schema.Types.ObjectId[];
    isActive: boolean;
    startsAt: Date;
    endsAt?: Date;
    buyXGetY?: {buyQuantity: number; getQuantity: number; getProductIds: Schema.Types.ObjectId[]};
    company: ICompany;
}

const DiscountSchema = new Schema<IDiscount>(
    {
        type: {
            type: SchemaTypes.String,
            enum: ["percentage", "fixed", "free_shipping", "buy_x_get_y"],
            required: true,
        },
        title: {type: SchemaTypes.String, required: true, trim: true},
        code: {type: SchemaTypes.String, trim: true, uppercase: true},
        value: {type: SchemaTypes.Number, required: true, min: 0},
        appliesTo: {
            type: SchemaTypes.String,
            enum: ["order", "product", "collection", "category"],
            required: true,
        },
        targetIds: {type: [{type: SchemaTypes.ObjectId}], default: []},
        minimumOrderAmount: {type: SchemaTypes.Number, min: 0},
        minimumQuantity: {type: SchemaTypes.Number, min: 0},
        usageLimit: {type: SchemaTypes.Number, min: 0},
        usageLimitPerCustomer: {type: SchemaTypes.Number, min: 0},
        usageCount: {type: SchemaTypes.Number, default: 0, min: 0},
        customerGroups: {type: [{type: SchemaTypes.ObjectId}], default: []},
        isActive: {type: SchemaTypes.Boolean, default: true},
        startsAt: {type: SchemaTypes.Date, required: true},
        endsAt: {type: SchemaTypes.Date},
        buyXGetY: {
            type: {
                buyQuantity: {type: SchemaTypes.Number, required: true, min: 1},
                getQuantity: {type: SchemaTypes.Number, required: true, min: 1},
                getProductIds: {type: [{type: SchemaTypes.ObjectId, ref: "Product"}], default: []},
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
const Discount = model<IDiscount>("Discount", DiscountSchema);
normalizeSchemaPermissions(Discount);
export default Discount;

addModelData(Discount, discountViews);
validateSchemaDefAgainstMongoose(DiscountSchema, DiscountSchemaDef, "Discount", ["usageCount"]);
