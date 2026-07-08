import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {applyFulfillmentIndexes} from "./fulfillment.indexes";
import {fulfillmentViews} from "./fulfillment.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {FulfillmentSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";

export type FulfillmentStatus = "pending" | "shipped" | "delivered" | "failed";

export interface IFulfillment extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    order: IProductOrder;
    items: {orderItemId: Schema.Types.ObjectId; quantity: number}[];
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: Date;
    estimatedDeliveryAt?: Date;
    deliveredAt?: Date;
    status: FulfillmentStatus;
    notes?: string;
    company: ICompany;
}

const FulfillmentSchema = new Schema<IFulfillment>(
    {
        order: {type: SchemaTypes.ObjectId, ref: "ProductOrder", required: true, refAllowlist: ProductOrderSimpleSnippet},
        items: {
            type: [
                {
                    orderItemId: {type: SchemaTypes.ObjectId, required: true},
                    quantity: {type: SchemaTypes.Number, required: true, min: 1},
                    _id: false,
                },
            ],
            default: [],
        },
        carrier: {type: SchemaTypes.String},
        trackingNumber: {type: SchemaTypes.String},
        trackingUrl: {type: SchemaTypes.String},
        shippedAt: {type: SchemaTypes.Date},
        estimatedDeliveryAt: {type: SchemaTypes.Date},
        deliveredAt: {type: SchemaTypes.Date},
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "shipped", "delivered", "failed"],
            default: "pending",
        },
        notes: {type: SchemaTypes.String},
    },
    {accessMode: "loose", timestamps: true},
);

ownershipPlugin(FulfillmentSchema);
auditPlugin(FulfillmentSchema);
softDeletePlugin(FulfillmentSchema);
applyFulfillmentIndexes(FulfillmentSchema);
const Fulfillment = model<IFulfillment>("Fulfillment", FulfillmentSchema);
normalizeSchemaPermissions(Fulfillment);
export default Fulfillment;

addModelData(Fulfillment, fulfillmentViews);
validateSchemaDefAgainstMongoose(FulfillmentSchema, FulfillmentSchemaDef, "Fulfillment");
