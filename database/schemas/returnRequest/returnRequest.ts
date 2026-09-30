import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
import {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
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
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductOrderSimpleSnippet} from "@eCommerceModule/database/schemas/productOrder/productOrder.snippets";
import {applyReturnRequestIndexes} from "./returnRequest.indexes";
import {returnRequestViews} from "./returnRequest.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {ReturnRequestSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.schema-def";

export type ReturnRequestType = "return" | "exchange" | "refund";
export type ReturnRequestStatus = "pending" | "approved" | "rejected" | "received" | "completed";

export interface IReturnRequest extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    order: IProductOrder;
    type: ReturnRequestType;
    status: ReturnRequestStatus;
    items: {
        orderItemId: Types.ObjectId;
        quantity: number;
        reason: string;
    }[];
    refundAmount?: number;
    customerNote?: string;
    adminNote?: string;
    resolvedBy?: IUser;
    resolvedAt?: Date;
    company: ICompany;
}

const ReturnRequestSchema = new Schema<IReturnRequest>(
    {
        order: {
            type: SchemaTypes.ObjectId, 
            ref: "ProductOrder", 
            required: true, 
            refAllowlist: ProductOrderSimpleSnippet
        },
        type: {
            type: SchemaTypes.String, 
            enum: ["return", "exchange", "refund"], 
            required: true
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "approved", "rejected", "received", "completed"],
            default: "pending",
            dynamicTableConfiguration: {
                enumTones: {
                    pending:     "warning",
                    approved:    "success",
                    rejected:    "danger",
                    received:    "success",
                    completed:   "success",
                },
            },
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
                    reason: {
                        type: SchemaTypes.String, 
                        required: true
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        refundAmount: {
            type: SchemaTypes.Number, 
            min: 0
        },
        customerNote: {
            type: SchemaTypes.String
        },
        adminNote: {
            type: SchemaTypes.String
        },
        resolvedBy: {
            type: SchemaTypes.ObjectId, 
            ref: "User", 
            refAllowlist: SimpleUserSnippet
        },
        resolvedAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(ReturnRequestSchema);
auditPlugin(ReturnRequestSchema);
softDeletePlugin(ReturnRequestSchema);
applyReturnRequestIndexes(ReturnRequestSchema);
lifeCyclePlugin(ReturnRequestSchema);
const ReturnRequest = model<IReturnRequest>("ReturnRequest", ReturnRequestSchema);
normalizeSchemaPermissions(ReturnRequest);
export default ReturnRequest;

addModelData(ReturnRequest, returnRequestViews);
validateSchemaDefAgainstMongoose(ReturnRequestSchema, ReturnRequestSchemaDef, "ReturnRequest", ["resolvedBy", "resolvedAt"]);
