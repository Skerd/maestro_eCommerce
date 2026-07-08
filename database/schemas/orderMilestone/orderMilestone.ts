import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IOrder } from "@eCommerceMarketplaceModule/database/schemas/order/order";
import { ICurrency } from "@coreModule/database/schemas/currency/currency";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { addModelData } from "@coreModule/database/collections";
import { CurrencySimpleSnippet } from "@coreModule/database/schemas/currency/currency.snippets";
import { OrderSimpleSnippet } from "@eCommerceMarketplaceModule/database/schemas/order/order.snippets";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import { IOwnershipPluginFields } from "@coreModule/database/types/plugin-fields";
import { applyOrderMilestoneIndexes } from "./orderMilestone.indexes";
import { orderMilestoneViews } from "./orderMilestone.views";

export type OrderMilestoneStatus = "pending" | "released" | "delivered";

export interface IOrderMilestone extends Document, IOwnershipPluginFields {
    company: ICompany;
    order: IOrder;
    name: string;
    amount: number;
    currency: ICurrency;
    status: OrderMilestoneStatus;
    orderIndex: number;
}

const OrderMilestoneSchema = new Schema<IOrderMilestone>(
    {
        order: {
            type: SchemaTypes.ObjectId,
            ref: "Order",
            required: true,
            refAllowlist: OrderSimpleSnippet,
        },
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
        },
        amount: {
            type: SchemaTypes.Number,
            required: true,
            default: 0,
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            required: true,
            refAllowlist: CurrencySimpleSnippet,
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "released", "delivered"],
            default: "pending",
        },
        orderIndex: {
            type: SchemaTypes.Number,
            required: true,
            default: 0,
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(OrderMilestoneSchema);
auditPlugin(OrderMilestoneSchema);
applyOrderMilestoneIndexes(OrderMilestoneSchema);
const OrderMilestone = model<IOrderMilestone>("OrderMilestone", OrderMilestoneSchema);
normalizeSchemaPermissions(OrderMilestone);
export default OrderMilestone;

addModelData(OrderMilestone, orderMilestoneViews);
