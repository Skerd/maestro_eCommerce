import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
import {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
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
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {applyFulfillmentIndexes} from "./fulfillment.indexes";
import {fulfillmentViews} from "./fulfillment.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {FulfillmentSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";

export type FulfillmentStatus = "pending" | "shipped" | "delivered" | "failed";

export interface IFulfillment
    extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    order: IProductOrder;
    items: {
        /** Opaque link to IProductOrderItem._id on the parent order — not a mongoose-populated ref. */
        orderItemId: Types.ObjectId;
        quantity: number;
    }[];
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
        order: {
            type: SchemaTypes.ObjectId, 
            ref: "ProductOrder", 
            required: true, 
            refAllowlist: ProductOrderSimpleSnippet
        },
        items: {
            type: [
                {
                    orderItemId: {
                        type: SchemaTypes.ObjectId, 
                        required: true
                    },
                    quantity: {
                        type: SchemaTypes.Number, 
                        required: true, 
                        min: 1
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        carrier: {
            type: SchemaTypes.String
        },
        trackingNumber: {
            type: SchemaTypes.String
        },
        trackingUrl: {
            type: SchemaTypes.String
        },
        shippedAt: {
            type: SchemaTypes.Date
        },
        estimatedDeliveryAt: {
            type: SchemaTypes.Date
        },
        deliveredAt: {
            type: SchemaTypes.Date
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "shipped", "delivered", "failed"],
            default: "pending",
            dynamicTableConfiguration: {
                enumTones: {
                    pending:     "warning",
                    shipped:     "success",
                    delivered:   "success",
                    failed:      "danger",
                },
            },
        },
        notes: {
            type: SchemaTypes.String
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(FulfillmentSchema);
auditPlugin(FulfillmentSchema);
softDeletePlugin(FulfillmentSchema);
applyFulfillmentIndexes(FulfillmentSchema);
lifeCyclePlugin(FulfillmentSchema);
const Fulfillment = model<IFulfillment>("Fulfillment", FulfillmentSchema);
normalizeSchemaPermissions(Fulfillment);
export default Fulfillment;

addModelData(Fulfillment, fulfillmentViews);
validateSchemaDefAgainstMongoose(FulfillmentSchema, FulfillmentSchemaDef, "Fulfillment");
