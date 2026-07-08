import { Document, model, Schema, SchemaTypes } from "mongoose";
import { IOrder } from "@eCommerceMarketplaceModule/database/schemas/order/order";
import { ICurrency } from "@coreModule/database/schemas/currency/currency";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { IOrderMilestone } from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import { IOwnershipPluginFields } from "@coreModule/database/types/plugin-fields";
import { addModelData } from "@coreModule/database/collections";
import { CompanyBlankSnippet } from "@coreModule/database/schemas/company/company.snippets";
import { CurrencySimpleSnippet } from "@coreModule/database/schemas/currency/currency.snippets";
import { OrderSimpleSnippet } from "@eCommerceMarketplaceModule/database/schemas/order/order.snippets";
import { OrderMilestoneSimpleSnippet } from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone.snippets";
import { applyEscrowTransactionIndexes } from "./escrowTransaction.indexes";
import { escrowTransactionViews } from "./escrowTransaction.views";

export type EscrowTransactionType = "hold" | "release" | "refund" | "fee";
export type EscrowTransactionStatus = "pending" | "completed" | "failed";

export interface IEscrowTransaction extends Document, IOwnershipPluginFields {
    order: IOrder;
    orderMilestone?: IOrderMilestone;
    amount: number;
    currency: ICurrency;
    type: EscrowTransactionType;
    status: EscrowTransactionStatus;
    company: ICompany;
    /** For release: provider payout amount. For fee: platform fee amount. */
    recipient?: "customer" | "provider" | "platform";
}

const EscrowTransactionSchema = new Schema<IEscrowTransaction>(
    {
        order: {
            type: SchemaTypes.ObjectId,
            ref: "Order",
            required: true,
            refAllowlist: OrderSimpleSnippet,
        },
        orderMilestone: {
            type: SchemaTypes.ObjectId,
            ref: "OrderMilestone",
            refAllowlist: OrderMilestoneSimpleSnippet,
        },
        amount: {
            type: SchemaTypes.Number,
            required: true,
            min: 0,
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            required: true,
            refAllowlist: CurrencySimpleSnippet,
        },
        type: {
            type: SchemaTypes.String,
            enum: ["hold", "release", "refund", "fee"],
            required: true,
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        company: {
            type: SchemaTypes.ObjectId,
            ref: "Company",
            required: true,
            refAllowlist: CompanyBlankSnippet,
        },
        recipient: {
            type: SchemaTypes.String,
            enum: ["customer", "provider", "platform"],
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(EscrowTransactionSchema);
auditPlugin(EscrowTransactionSchema);
applyEscrowTransactionIndexes(EscrowTransactionSchema);
const EscrowTransaction = model<IEscrowTransaction>("EscrowTransaction", EscrowTransactionSchema);
normalizeSchemaPermissions(EscrowTransaction);
export default EscrowTransaction;

addModelData(EscrowTransaction, escrowTransactionViews);
