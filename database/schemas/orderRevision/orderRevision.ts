import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IOrder } from "@eCommerceModule/database/schemas/order/order";
import { IOrderDelivery } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import { IUser } from "@coreModule/database/schemas/user/user";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { addModelData } from "@coreModule/database/collections";
import { SimpleUserSnippet } from "@coreModule/database/schemas/user/user.snippets";
import { OrderSimpleSnippet } from "@eCommerceModule/database/schemas/order/order.snippets";
import { OrderDeliverySimpleSnippet } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.snippets";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import { CompanyBlankSnippet } from "@coreModule/database/schemas/company/company.snippets";
import {IOwnershipPluginFields, ILifeCyclePluginFields} from "@coreModule/database/types/plugin-fields";
import { applyOrderRevisionIndexes } from "./orderRevision.indexes";
import { orderRevisionViews } from "./orderRevision.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {OrderRevisionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderRevision/orderRevision.schema-def";

export type OrderRevisionStatus = "pending" | "completed";

export interface IOrderRevision extends Document, IOwnershipPluginFields, ILifeCyclePluginFields {
    company: ICompany;
    order: IOrder;
    delivery: IOrderDelivery;
    requestedBy: IUser;
    reason: string;
    status: OrderRevisionStatus;
}

const OrderRevisionSchema = new Schema<IOrderRevision>(
    {
        company: {
            type: SchemaTypes.ObjectId,
            ref: "Company",
            required: true,
            refAllowlist: CompanyBlankSnippet,
        },
        order: {
            type: SchemaTypes.ObjectId,
            ref: "Order",
            required: true,
            refAllowlist: OrderSimpleSnippet,
        },
        delivery: {
            type: SchemaTypes.ObjectId,
            ref: "OrderDelivery",
            required: true,
            refAllowlist: OrderDeliverySimpleSnippet,
        },
        requestedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
        },
        reason: {
            type: SchemaTypes.String,
            required: true,
            default: "",
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "completed"],
            default: "pending",
            dynamicTableConfiguration: {
                enumTones: {
                    pending:     "warning",
                    completed:   "success",
                },
            },
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(OrderRevisionSchema);
auditPlugin(OrderRevisionSchema);
lifeCyclePlugin(OrderRevisionSchema);
applyOrderRevisionIndexes(OrderRevisionSchema);
validateSchemaDefAgainstMongoose(OrderRevisionSchema, OrderRevisionSchemaDef, "OrderRevision", [
    "requestedBy",
    "status",
    "company",
]);
const OrderRevision = model<IOrderRevision>("OrderRevision", OrderRevisionSchema);
normalizeSchemaPermissions(OrderRevision);
export default OrderRevision;

addModelData(OrderRevision, orderRevisionViews);
